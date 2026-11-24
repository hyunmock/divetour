import test from "node:test";
import assert from "node:assert/strict";
import { readNotion } from "../src/lib/notion.ts";

const id = (n) => n.toString(16).padStart(32, "0");
const env = {
  NOTION_TOKEN: "test-only",
  NOTION_TOURS_DATABASE_ID: id(1),
  NOTION_FAQ_DATABASE_ID: id(2),
  NOTION_MEDIA_DATABASE_ID: id(3),
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
function media(n, tourId, expiry) {
  return {
    id: id(n),
    properties: {
      제목: title("앨범 " + n),
      "공개 상태": { status: { name: "공개" } },
      "관련 투어": { relation: [{ id: id(tourId) }] },
      "MYBOX URL": { url: "https://mybox.naver.com/share/test" },
      "링크 만료일": { date: expiry ? { start: expiry, end: null } : null },
      "표시 순서": { number: n },
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
test("공개된 완료 투어 중 기록 공개와 만료 조건을 통과한 앨범만 표시한다", async () => {
  const bodies = [];
  const content = await readNotion(
    env,
    api(
      [
        [
          tour(10, "완료", true, true),
          tour(11, "완료", false, true),
          tour(12, "완료", true, false),
          tour(13, "취소", true, true),
        ],
        [],
        [
          media(20, 10, "2026-11-24"),
          media(21, 11, null),
          media(22, 12, null),
          media(23, 10, "2026-11-23"),
        ],
      ],
      bodies,
    ),
    new Date("2026-11-23T20:00:00Z"),
  );
  assert.deepEqual(
    content.media.map((m) => m.title),
    ["앨범 20"],
  );
  assert.deepEqual(bodies, [id(10)]);
  assert.deepEqual(
    content.tours.map((t) => t.slug),
    ["tour-10", "tour-12"],
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
