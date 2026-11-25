import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";

const id = z
  .string()
  .regex(/^(?:[a-f0-9]{32}|[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12})$/i);
const text = z
  .array(z.object({ plain_text: z.string() }))
  .transform((parts) => parts.map((p) => p.plain_text).join(""));
const name = z.object({ name: z.string() });
const prop = z.record(z.string(), z.unknown());
const row = z.object({ id, properties: z.record(z.string(), prop) });
const lines = z.enum([
  "paragraph",
  "heading_1",
  "heading_2",
  "heading_3",
  "bulleted_list_item",
  "numbered_list_item",
  "quote",
  "divider",
  "callout",
  "table_row",
]);
export type Rich = { text: string; href?: string };
export type Line = {
  kind: z.infer<typeof lines> | "image" | "file";
  text: string;
  parts?: Rich[];
  cells?: Rich[][];
  src?: string;
  header?: boolean;
};
const title = z
  .object({ title: text })
  .transform((v) => z.string().trim().min(1).parse(v.title));
const rich = z.object({ rich_text: text }).transform((v) => v.rich_text);
const checked = z
  .object({ checkbox: z.boolean() })
  .transform((v) => v.checkbox);
const status = z.object({ status: name }).transform((v) => v.status.name);
const choice = z
  .object({ select: z.object({ name: z.string() }).nullable() })
  .transform((v) => v.select?.name ?? "");
const optionalText = (value: unknown) => (value == null ? "" : rich.parse(value));
const optionalChoice = (value: unknown) => (value == null ? "" : choice.parse(value));
const date = z
  .object({
    date: z
      .object({
        start: z.iso.date().or(z.iso.datetime({ offset: true })),
        end: z.string().nullable(),
      })
      .nullable(),
  })
  .transform((v) => v.date);
const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const linkedText = z.array(z.object({
  plain_text: z.string(),
  href: z.string().nullable().optional(),
})).transform((parts) => parts.map(({ plain_text, href }) => {
  if (!href) return { text: plain_text };
  const url = new URL(href);
  if (url.protocol !== "https:" && url.protocol !== "http:")
    throw new Error("지원하지 않는 링크 주소");
  if (url.hostname === "mybox.naver.com" &&
      (url.protocol !== "https:" || url.username || url.password || url.port || url.pathname === "/"))
    throw new Error("MYBOX 공유 링크 형식 오류");
  return { text: plain_text, href };
}));
const block = z.looseObject({ id, type: z.string(), has_children: z.boolean() });
const extensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/avif": "avif",
  "application/pdf": "pdf",
};
const norm = (value: string) => value.replaceAll("-", "").toLowerCase();
type Env = Record<string, string | undefined>;
type Options = { assetsDir?: string };

export async function readNotion(
  env: Env,
  http: typeof fetch = fetch,
  options: Options = {},
) {
  if (!env.NOTION_TOKEN) throw new Error("Notion 빌드 인증 정보가 필요합니다.");
  const assetsDir = options.assetsDir ?? join(process.cwd(), "public", "assets");
  async function send(url: string, init: () => RequestInit) {
    let wait = 200;
    for (let attempt = 0; attempt < 6; attempt++) {
      const res = await http(url, init());
      if (res.status !== 429 || attempt === 5) return res;
      const retry = Number(res.headers.get("retry-after"));
      const delay = Number.isFinite(retry) && retry >= 0 ? retry * 1000 : wait;
      await new Promise((resolve) => setTimeout(resolve, delay));
      wait *= 2;
    }
    throw new Error("Notion 조회 실패 (HTTP 429)");
  }
  async function api(path: string, payload?: object) {
    const res = await send("https://api.notion.com/v1/" + path, () => ({
      method: payload ? "POST" : "GET",
      headers: {
        Authorization: "Bearer " + env.NOTION_TOKEN,
        "Notion-Version": "2025-09-03",
        "Content-Type": "application/json",
      },
      body: payload ? JSON.stringify(payload) : undefined,
    }));
    if (!res.ok) throw new Error("Notion 조회 실패 (HTTP " + res.status + ")");
    return res.json();
  }
  async function all<T>(
    schema: z.ZodType<T>,
    request: (cursor?: string) => Promise<unknown>,
  ) {
    const result: T[] = [];
    let cursor: string | undefined;
    const seen = new Set<string>();
    do {
      const p = z
        .object({
          results: z.array(schema),
          has_more: z.boolean(),
          next_cursor: z.string().nullable(),
        })
        .parse(await request(cursor));
      result.push(...p.results);
      if (!p.has_more) break;
      if (!p.next_cursor || seen.has(p.next_cursor))
        throw new Error("Notion 페이지 구분 오류");
      cursor = p.next_cursor;
      seen.add(cursor);
    } while (cursor);
    return result;
  }
  async function query(key: string, filter: object) {
    const db = z
      .object({ data_sources: z.array(z.object({ id })).length(1) })
      .parse(await api("databases/" + id.parse(env[key])));
    return all(row, (start_cursor) =>
      api("data_sources/" + db.data_sources[0].id + "/query", {
        filter,
        start_cursor,
      }),
    );
  }
  async function save(remote: string, folder: string, blockId: string, route: string) {
    let parsed: URL;
    try {
      parsed = new URL(remote);
    } catch {
      throw new Error("이미지 저장 실패 (" + route + ")");
    }
    if (parsed.protocol !== "https:") throw new Error("이미지 저장 실패 (" + route + ")");
    const res = await send(remote, () => ({ method: "GET" }));
    if (!res.ok) throw new Error("이미지 저장 실패 (" + route + ")");
    const type = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    const ext = extensions[type];
    if (!ext) throw new Error("이미지 저장 실패 (" + route + ")");
    const filename = norm(blockId) + "." + ext;
    await mkdir(join(assetsDir, folder), { recursive: true });
    await writeFile(join(assetsDir, folder, filename), Buffer.from(await res.arrayBuffer()));
    return "assets/" + folder + "/" + filename;
  }
  async function media(item: z.infer<typeof block>, folder: string): Promise<Line> {
    const payload = z.object({
      type: z.enum(["file", "external"]),
      caption: z.unknown().optional(),
      name: z.string().optional(),
      file: z.object({ url: z.string() }).optional(),
      external: z.object({ url: z.string() }).optional(),
    }).parse(item[item.type]);
    const remote = payload.type === "external" ? payload.external?.url : payload.file?.url;
    if (!remote) throw new Error("이미지 저장 실패 (" + folder + ")");
    const caption = linkedText.parse(payload.caption ?? []);
    const src = await save(remote, folder, item.id, folder);
    if (item.type === "image") {
      return { kind: "image", text: caption.map((part) => part.text).join(""), src, parts: caption };
    }
    const label = payload.name || caption.map((part) => part.text).join("") || "파일";
    return { kind: "file", text: label, src, parts: caption.length ? caption : [{ text: label }] };
  }
  async function body(page: string, folder: string): Promise<Line[]> {
    const blocks = await all(block, (cursor) =>
      api(
        "blocks/" +
          page +
          "/children" +
          (cursor ? "?start_cursor=" + encodeURIComponent(cursor) : ""),
      ),
    );
    const result: Line[] = [];
    for (const b of blocks) {
      if (b.type === "table") {
        const table = z.object({ has_column_header: z.boolean() }).parse(b.table);
        const rows = await body(b.id, folder);
        if (table.has_column_header && rows[0]) rows[0].header = true;
        result.push(...rows);
        continue;
      }
      if (b.type === "image" || b.type === "file") {
        result.push(await media(b, folder));
        continue;
      }
      const kind = lines.parse(b.type);
      if (kind === "table_row") {
        const cells = z.object({ cells: z.array(linkedText) }).parse(b.table_row).cells;
        result.push({
          kind,
          text: cells.map((cell) => cell.map((part) => part.text).join("")).join(" · "),
          cells,
        });
      } else {
        const parts = kind === "divider" ? [] : linkedText.parse(z.object({ rich_text: z.unknown() }).parse(b[kind]).rich_text);
        result.push({ kind, text: parts.map((part) => part.text).join(""), parts });
      }
      if (b.has_children) result.push(...(await body(b.id, folder)));
    }
    return result;
  }
  function detailTarget(item: z.infer<typeof block>, route: string) {
    if (item.type === "link_to_page") {
      const link = z.object({ type: z.string(), page_id: z.string().optional() }).parse(item.link_to_page);
      if (link.type !== "page_id" || !link.page_id)
        throw new Error("투어 상세 링크 오류 (" + route + ")");
      return id.parse(link.page_id);
    }
    if (item.type !== "paragraph") throw new Error("투어 상세 링크 오류 (" + route + ")");
    const parts = z.object({
      rich_text: z.array(z.looseObject({
        mention: z.looseObject({
          type: z.string(),
          page: z.looseObject({ id: z.string() }).optional(),
        }).optional(),
      })),
    }).parse(item.paragraph);
    const targets = parts.rich_text.flatMap((part) =>
      part.mention?.type === "page" && part.mention.page?.id ? [part.mention.page.id] : [],
    );
    if (targets.length !== 1) throw new Error("투어 상세 링크 오류 (" + route + ")");
    return id.parse(targets[0]);
  }
  async function detailBody(rowId: string, route: string) {
    const parentId = env.NOTION_TOUR_DETAILS_PAGE_ID;
    if (!parentId) throw new Error("투어 상세 페이지 정보가 필요합니다.");
    const first = z.object({
      results: z.array(block),
    }).parse(await api("blocks/" + rowId + "/children?page_size=1")).results[0];
    if (!first) throw new Error("투어 상세 링크 오류 (" + route + ")");
    const detail = detailTarget(first, route);
    const page = z.object({
      parent: z.looseObject({ type: z.string(), page_id: z.string().optional() }),
    }).parse(await api("pages/" + detail));
    if (page.parent.type !== "page_id" || norm(page.parent.page_id ?? "") !== norm(id.parse(parentId)))
      throw new Error("투어 상세 페이지 연결 오류 (" + route + ")");
    return { id: detail, body: await body(detail, route) };
  }
  const approved = { property: "공개 여부", checkbox: { equals: true } };
  const records = await query("NOTION_TOURS_DATABASE_ID", approved);
  const parsed = [];
  const slugs = new Set<string>();
  const details = new Set<string>();
  for (const r of records) {
    const p = r.properties;
    if (!checked.parse(p["공개 여부"])) continue;
    const state = z
      .enum(["제안", "검토", "확정", "완료", "취소"])
      .parse(status.parse(p["상태"]));
    if (state === "취소") continue;
    const route = slug.parse(rich.parse(p["슬러그"]));
    if (slugs.has(route) || ["upcoming", "completed"].includes(route))
      throw new Error("중복 또는 예약된 투어 슬러그");
    slugs.add(route);
    const archive = checked.parse(p["기록 공개"]);
    parsed.push({
      id: r.id,
      slug: route,
      title: title.parse(p["투어명"]),
      state,
      archive,
      location: rich.parse(p["장소"]),
      dates: date.parse(p["일정"]),
      guideForm: optionalChoice(p["인솔 형태"]),
      instructor: optionalText(p["인솔강사"]),
      proposer: optionalText(p["제안자"]),
      shop: optionalText(p["다이빙숍"]),
      showBody: state !== "완료" || archive,
    });
  }
  const tours = [];
  for (const tour of parsed) {
    let body: Line[] = [];
    if (tour.showBody) {
      const detail = await detailBody(tour.id, tour.slug);
      const linked = norm(detail.id);
      if (details.has(linked)) throw new Error("중복된 투어 상세 페이지 (" + tour.slug + ")");
      details.add(linked);
      body = detail.body;
    }
    tours.push({
      id: tour.id,
      slug: tour.slug,
      title: tour.title,
      state: tour.state,
      archive: tour.archive,
      location: tour.location,
      dates: tour.dates,
      guideForm: tour.guideForm,
      instructor: tour.instructor,
      proposer: tour.proposer,
      shop: tour.shop,
      body,
    });
  }
  tours.sort((a, b) =>
    (a.dates?.start ?? "9999").localeCompare(b.dates?.start ?? "9999"),
  );
  async function page(key: string) {
    if (!env[key]) return [];
    const pageId = id.parse(env[key]);
    const first = z
      .object({ results: z.array(z.looseObject({ type: z.string() })) })
      .parse(await api("blocks/" + pageId + "/children?page_size=1"))
      .results[0];
    if (
      first?.type !== "paragraph" ||
      rich.parse(first.paragraph).trim() !== "홈페이지 공개 승인"
    )
      return [];
    const approvedBody = await body(pageId, norm(pageId));
    if (approvedBody.shift()?.text.trim() !== "홈페이지 공개 승인")
      throw new Error("페이지 공개 상태 변경");
    return approvedBody;
  }
  return {
    tours,
    faq: await page("NOTION_FAQ_PAGE_ID"),
    about: await page("NOTION_ABOUT_PAGE_ID"),
    rules: await page("NOTION_RULES_PAGE_ID"),
  };
}
export type SiteContent = Awaited<ReturnType<typeof readNotion>>;
