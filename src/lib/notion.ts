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
export type Line = { kind: z.infer<typeof lines>; text: string; parts?: { text: string; href?: string }[] };
const title = z
  .object({ title: text })
  .transform((v) => z.string().trim().min(1).parse(v.title));
const rich = z.object({ rich_text: text }).transform((v) => v.rich_text);
const checked = z
  .object({ checkbox: z.boolean() })
  .transform((v) => v.checkbox);
const status = z.object({ status: name }).transform((v) => v.status.name);
const order = z
  .object({ number: z.number().nullable() })
  .transform((v) => v.number ?? Infinity);
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
type Env = Record<string, string | undefined>;

export async function readNotion(
  env: Env,
  http: typeof fetch = fetch,
) {
  if (!env.NOTION_TOKEN) throw new Error("Notion 빌드 인증 정보가 필요합니다.");
  async function api(path: string, body?: object) {
    const res = await http("https://api.notion.com/v1/" + path, {
      method: body ? "POST" : "GET",
      headers: {
        Authorization: "Bearer " + env.NOTION_TOKEN,
        "Notion-Version": "2025-09-03",
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
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
  async function body(page: string): Promise<Line[]> {
    const blocks = await all(
      z.looseObject({ id, type: z.string(), has_children: z.boolean() }),
      (cursor) =>
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
        result.push(...(await body(b.id)));
        continue;
      }
      const kind = lines.parse(b.type);
      if (kind === "table_row") {
        const row = z.object({ cells: z.array(text) }).parse(b.table_row);
        result.push({ kind, text: row.cells.join(" · ") });
      } else {
        const parts = kind === "divider" ? [] : linkedText.parse(z.object({ rich_text: z.unknown() }).parse(b[kind]).rich_text);
        result.push({ kind, text: parts.map((part) => part.text).join(""), parts });
      }
      if (b.has_children) result.push(...(await body(b.id)));
    }
    return result;
  }
  const approved = { property: "공개 여부", checkbox: { equals: true } };
  const records = await query("NOTION_TOURS_DATABASE_ID", approved);
  const tours = [];
  const slugs = new Set<string>();
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
    tours.push({
      id: r.id,
      slug: route,
      title: title.parse(p["투어명"]),
      state,
      archive,
      location: rich.parse(p["장소"]),
      dates: date.parse(p["일정"]),
      body: state === "완료" && !archive ? [] : await body(r.id),
    });
  }
  tours.sort((a, b) =>
    (a.dates?.start ?? "9999").localeCompare(b.dates?.start ?? "9999"),
  );
  const faq = [];
  for (const r of await query("NOTION_FAQ_DATABASE_ID", approved)) {
    const p = r.properties;
    if (!checked.parse(p["공개 여부"])) continue;
    const answer = await body(r.id);
    if (!answer.some((v) => v.text.trim()))
      throw new Error("공개 FAQ 답변 누락");
    faq.push({
      title: title.parse(p["질문"]),
      order: order.parse(p["표시 순서"]),
      body: answer,
    });
  }
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
    const approvedBody = await body(pageId);
    if (approvedBody.shift()?.text.trim() !== "홈페이지 공개 승인")
      throw new Error("페이지 공개 상태 변경");
    return approvedBody;
  }
  return {
    tours,
    faq: faq.sort((a, b) => a.order - b.order),
    about: await page("NOTION_ABOUT_PAGE_ID"),
    rules: await page("NOTION_RULES_PAGE_ID"),
  };
}
export type SiteContent = Awaited<ReturnType<typeof readNotion>>;
