import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readNotion } from "../src/lib/notion.ts";

const id = (n) => n.toString(16).padStart(32, "0");
const env = {
  NOTION_TOKEN: "test-only",
  NOTION_TOURS_DATABASE_ID: id(1),
  NOTION_TOUR_DETAILS_PAGE_ID: id(3),
};
const title = (plain_text) => ({ title: [{ plain_text }] });
const rich = (plain_text) => ({ rich_text: [{ plain_text }] });
function tour(n, state, visible, archive) {
  return {
    id: id(n),
    properties: {
      투어명: title("테스트"),
      슬러그: rich("tour-" + n),
      상태: { status: { name: state } },
      "공개 여부": { checkbox: visible },
      "기록 공개": { checkbox: archive },
      장소: rich(""),
      일정: { date: null },
    },
  };
}
function mention(page) {
  return {
    id: id(20),
    type: "paragraph",
    has_children: false,
    paragraph: {
      rich_text: [
        { plain_text: "상세 페이지: ", href: null },
        {
          type: "mention",
          plain_text: "상세",
          href: "https://www.notion.so/" + page,
          mention: { type: "page", page: { id: page } },
        },
      ],
    },
  };
}
function paragraph(n, plain_text, href = null) {
  return {
    id: id(n),
    type: "paragraph",
    has_children: false,
    paragraph: { rich_text: [{ plain_text, href }] },
  };
}
function api(sources, readBodies = []) {
  return async (address) => {
    const [, , kind, key] = new URL(address).pathname.split("/");
    if (kind === "databases")
      return Response.json({ data_sources: [{ id: key }] });
    if (kind === "blocks") readBodies.push(key);
    const results = kind === "blocks" ? [] : sources[parseInt(key, 16) - 1];
    return Response.json({ results, has_more: false, next_cursor: null });
  };
}
function notion(pages) {
  return async (address) => {
    const url = new URL(address);
    if (url.hostname !== "api.notion.com") return pages.file?.(url);
    const [, , kind, key] = url.pathname.split("/");
    pages.seen?.push(kind + " " + key + url.search);
    if (kind === "databases")
      return Response.json({ data_sources: [{ id: key }] });
    if (kind === "pages")
      return Response.json(pages.parents?.[key] ?? { parent: { type: "page_id", page_id: id(3) } });
    if (kind === "data_sources")
      return Response.json({ results: pages.tours ?? [], has_more: false, next_cursor: null });
    const results = url.searchParams.get("page_size") === "1"
      ? (pages.first?.[key] ?? [])
      : (pages.blocks?.[key] ?? []);
    return Response.json({ results, has_more: false, next_cursor: null });
  };
}
test("상세 페이지 본문만 가져오고 행의 이관 문단은 버린다", async () => {
  const seen = [];
  const content = await readNotion(env, notion({
    seen,
    tours: [tour(10, "확정", true, false)],
    first: { [id(10)]: [mention(id(40))] },
    blocks: { [id(40)]: [paragraph(41, "공개 본문")] },
  }));
  assert.deepEqual(content.tours[0].body.map((line) => line.text), ["공개 본문"]);
  assert.equal(content.tours[0].guideForm, "");
  assert.equal(content.tours[0].instructor, "");
  assert.equal(content.tours[0].proposer, "");
  assert.equal(content.tours[0].shop, "");
  assert.equal(seen.some((item) => item.startsWith("blocks " + id(40))), true);
  assert.equal(seen.filter((item) => item.startsWith("blocks " + id(10))).length, 1);
});
test("투어 목록에 인솔 형태, 인솔강사, 제안자, 다이빙숍을 담는다", async () => {
  const row = tour(10, "확정", true, false);
  row.properties["인솔 형태"] = { select: { name: "인솔강사" } };
  row.properties["인솔강사"] = rich("김다이브");
  row.properties["제안자"] = rich("이제안");
  row.properties["다이빙숍"] = rich("블루샵");
  const content = await readNotion(env, notion({
    tours: [row],
    first: { [id(10)]: [mention(id(40))] },
    blocks: { [id(40)]: [paragraph(41, "공개 본문")] },
  }));
  assert.deepEqual(
    {
      guideForm: content.tours[0].guideForm,
      instructor: content.tours[0].instructor,
      proposer: content.tours[0].proposer,
      shop: content.tours[0].shop,
    },
    { guideForm: "인솔강사", instructor: "김다이브", proposer: "이제안", shop: "블루샵" },
  );
});
test("부모 페이지가 투어 상세가 아니면 빌드를 중단한다", async () => {
  await assert.rejects(
    readNotion(env, notion({
      tours: [tour(10, "확정", true, false)],
      first: { [id(10)]: [mention(id(40))] },
      parents: { [id(40)]: { parent: { type: "page_id", page_id: id(9) } } },
    })),
    /투어 상세 페이지 연결 오류 \(tour-10\)/,
  );
});
test("첫 블록에 상세 페이지 멘션이 없으면 빌드를 중단한다", async () => {
  await assert.rejects(
    readNotion(env, notion({
      tours: [tour(10, "확정", true, false)],
      first: { [id(10)]: [paragraph(21, "본문만 있습니다")] },
    })),
    /투어 상세 링크 오류 \(tour-10\)/,
  );
});
test("link_to_page도 상세 페이지로 따른다", async () => {
  const content = await readNotion(env, notion({
    tours: [tour(10, "확정", true, false)],
    first: {
      [id(10)]: [{
        id: id(20),
        type: "link_to_page",
        has_children: false,
        link_to_page: { type: "page_id", page_id: id(40) },
      }],
    },
    blocks: { [id(40)]: [paragraph(41, "링크 본문")] },
  }));
  assert.equal(content.tours[0].body[0].text, "링크 본문");
});
test("완료 투어 본문은 기록 공개가 켜진 상세 페이지만 읽는다", async () => {
  const seen = [];
  const content = await readNotion(env, notion({
    seen,
    tours: [tour(10, "완료", true, true), tour(12, "완료", true, false)],
    first: { [id(10)]: [mention(id(40))] },
    blocks: {
      [id(40)]: [paragraph(41, "사진 폴더", "https://mybox.naver.com/share/test")],
    },
  }));
  assert.deepEqual(content.tours.map((item) => [item.slug, item.body.map((line) => line.text)]), [
    ["tour-10", ["사진 폴더"]],
    ["tour-12", []],
  ]);
  assert.deepEqual(content.tours[0].body[0].parts, [
    { text: "사진 폴더", href: "https://mybox.naver.com/share/test" },
  ]);
  assert.equal(seen.some((item) => item.includes(id(12))), false);
});
test("같은 상세 페이지가 두 투어에 연결되면 빌드를 중단한다", async () => {
  await assert.rejects(
    readNotion(env, notion({
      tours: [tour(10, "확정", true, false), tour(11, "확정", true, false)],
      first: { [id(10)]: [mention(id(40))], [id(11)]: [mention(id(40))] },
      blocks: { [id(40)]: [paragraph(41, "본문")] },
    })),
    /중복된 투어 상세 페이지 \(tour-11\)/,
  );
});
test("공개 투어 슬러그가 중복되면 빌드 데이터를 반환하지 않는다", async () => {
  await assert.rejects(
    readNotion(
      env,
      api([[tour(10, "확정", true, false), tour(10, "확정", true, false)]]),
    ),
    /슬러그/,
  );
});
test("인증이나 API 조회가 실패하면 중단한다", async () => {
  await assert.rejects(readNotion({}), /인증/);
  await assert.rejects(
    readNotion(env, async () => new Response(null, { status: 403 })),
    /403/,
  );
});
test("429는 기다린 뒤 다시 요청한다", async () => {
  let calls = 0;
  const inner = notion({
    tours: [tour(10, "확정", true, false)],
    first: { [id(10)]: [mention(id(40))] },
    blocks: { [id(40)]: [paragraph(41, "다시 받은 본문")] },
  });
  const content = await readNotion(env, async (address, init) => {
    calls += 1;
    if (calls === 1)
      return new Response(null, { status: 429, headers: { "retry-after": "0" } });
    return inner(address, init);
  });
  assert.equal(content.tours[0].body[0].text, "다시 받은 본문");
  assert.equal(calls > 1, true);
});
test("이미지 블록은 로컬 파일로 저장한다", async () => {
  const assetsDir = await mkdtemp(join(tmpdir(), "divetour-"));
  const content = await readNotion(env, notion({
    tours: [tour(10, "확정", true, false)],
    first: { [id(10)]: [mention(id(40))] },
    blocks: {
      [id(40)]: [{
        id: id(30),
        type: "image",
        has_children: false,
        image: { type: "file", caption: [], file: { url: "https://cdn.example/photo.png" } },
      }],
    },
    file: () => new Response(Uint8Array.from([1, 2, 3]), { headers: { "content-type": "image/png" } }),
  }), { assetsDir });
  const src = "assets/tour-10/" + id(30) + ".png";
  assert.equal(content.tours[0].body[0].src, src);
  assert.deepEqual(
    [...await readFile(join(assetsDir, "tour-10", id(30) + ".png"))],
    [1, 2, 3],
  );
});
test("표는 칸을 유지하고 열 머리글을 표시한다", async () => {
  const content = await readNotion(env, notion({
    tours: [tour(10, "확정", true, false)],
    first: { [id(10)]: [mention(id(40))] },
    blocks: {
      [id(40)]: [{
        id: id(50),
        type: "table",
        has_children: true,
        table: { has_column_header: true },
      }],
      [id(50)]: [
        {
          id: id(51),
          type: "table_row",
          has_children: false,
          table_row: { cells: [[{ plain_text: "구간", href: null }], [{ plain_text: "날짜", href: null }]] },
        },
        {
          id: id(52),
          type: "table_row",
          has_children: false,
          table_row: { cells: [[{ plain_text: "가는 편", href: null }], [{ plain_text: "2027. 02. 26", href: null }]] },
        },
      ],
    },
  }));
  assert.equal(content.tours[0].body[0].header, true);
  assert.deepEqual(content.tours[0].body[0].cells, [[{ text: "구간" }], [{ text: "날짜" }]]);
  assert.equal(content.tours[0].body[1].header, undefined);
  assert.equal(content.tours[0].body[1].text, "가는 편 · 2027. 02. 26");
});
test("글머리 항목 안의 번호 목록을 유지한다", async () => {
  const content = await readNotion(env, notion({
    tours: [tour(10, "확정", true, false)],
    first: { [id(10)]: [mention(id(40))] },
    blocks: {
      [id(40)]: [{
        id: id(60),
        type: "bulleted_list_item",
        has_children: true,
        bulleted_list_item: { rich_text: [{ plain_text: "입장료", href: null }] },
      }],
      [id(60)]: [{
        id: id(61),
        type: "numbered_list_item",
        has_children: false,
        numbered_list_item: { rich_text: [{ plain_text: "코론 아일랜드", href: null }] },
      }],
    },
  }));
  assert.deepEqual(content.tours[0].body.map((line) => [line.kind, line.text]), [
    ["bulleted_list_item", "입장료"],
    ["numbered_list_item", "코론 아일랜드"],
  ]);
});
function block(n, type, plain_text) {
  return {
    id: id(n),
    type,
    has_children: false,
    [type]: { rich_text: [{ plain_text, href: null }] },
  };
}
function faqHttp(blocks) {
  return async (address) => {
    const url = new URL(address);
    const [, , kind, key] = url.pathname.split("/");
    if (kind === "databases")
      return Response.json({ data_sources: [{ id: key }] });
    const results =
      kind === "blocks" && key === id(2)
        ? url.searchParams.get("page_size") === "1"
          ? blocks.slice(0, 1)
          : blocks
        : [];
    return Response.json({ results, has_more: false, next_cursor: null });
  };
}
test("FAQ 페이지는 공개 승인 문단을 빼고 제목 단계를 유지한다", async () => {
  const result = await readNotion(
    { ...env, NOTION_FAQ_PAGE_ID: id(2) },
    faqHttp([
      block(21, "paragraph", "홈페이지 공개 승인"),
      block(22, "heading_2", "모임 및 가입"),
      block(23, "heading_3", "이 방은 어떤 모임인가요?"),
      block(24, "paragraph", "소규모 모임입니다."),
    ]),
  );
  assert.deepEqual(
    result.faq.map((line) => [line.kind, line.text]),
    [
      ["heading_2", "모임 및 가입"],
      ["heading_3", "이 방은 어떤 모임인가요?"],
      ["paragraph", "소규모 모임입니다."],
    ],
  );
});
test("공개 승인 문단이 없으면 FAQ를 비운다", async () => {
  const result = await readNotion(
    { ...env, NOTION_FAQ_PAGE_ID: id(2) },
    faqHttp([block(21, "paragraph", "자주 묻는 질문입니다.")]),
  );
  assert.deepEqual(result.faq, []);
});
