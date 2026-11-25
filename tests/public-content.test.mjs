import test from "node:test";
import assert from "node:assert/strict";
import { readNotion } from "../src/lib/notion.ts";

const id = (n) => n.toString(16).padStart(32, "0");
const env = {
  NOTION_TOKEN: "test-only",
  NOTION_TOURS_DATABASE_ID: id(1),
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
test("완료 투어 본문은 기록 공개 승인을 따르고 링크를 보존한다", async () => {
  const bodies = [];
  const content = await readNotion(
    env,
    api([[tour(10, "완료", true, true), tour(12, "완료", true, false)], []], bodies),
  );
  assert.deepEqual(bodies, [id(10)]);
  assert.deepEqual(content.tours.map((t) => t.slug), ["tour-10", "tour-12"]);
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
test("투어 본문의 MYBOX 링크를 주소와 함께 보존한다", async () => {
  const linked = async (address) => {
    const [, , kind, key] = new URL(address).pathname.split("/");
    if (kind === "databases") return Response.json({ data_sources: [{ id: key }] });
    const results = kind === "blocks"
      ? key === id(10) ? [{
          id: id(30), type: "paragraph", has_children: false,
          paragraph: { rich_text: [{ plain_text: "사진 폴더", href: "https://mybox.naver.com/share/test" }] },
        }] : []
      : key === id(1) ? [tour(10, "완료", true, true)] : [];
    return Response.json({ results, has_more: false, next_cursor: null });
  };
  const result = await readNotion(env, linked);
  assert.deepEqual(result.tours[0].body[0].parts, [
    { text: "사진 폴더", href: "https://mybox.naver.com/share/test" },
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
