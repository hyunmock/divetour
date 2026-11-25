import { z } from "zod";
import { getSecret } from "astro:env/server";
import { readNotion, type SiteContent } from "./notion";
let snapshot: Promise<SiteContent> | undefined;
export function content() {
  snapshot ??= readNotion(
    Object.fromEntries(
      [
        "TOKEN",
        "TOURS_DATABASE_ID",
        "FAQ_PAGE_ID",
        "ABOUT_PAGE_ID",
        "RULES_PAGE_ID",
        "TOUR_DETAILS_PAGE_ID",
      ].map((s) => {
        const key = "NOTION_" + s;
        return [key, getSecret(key)];
      }),
    ),
  ).catch((error: unknown) => {
    // 원본 응답이나 인증 정보를 빌드 로그에 남기지 않습니다.
    if (error instanceof Error && error.name !== "ZodError") {
      if (
        /^(Notion 조회 실패 \(HTTP \d{3}\)|투어 상세 |중복된 투어 상세|중복 또는 예약된 투어 슬러그|지원하지 않는 링크|MYBOX 공유 링크|이미지 저장 실패|페이지 공개 상태)/.test(
          error.message,
        )
      )
        throw error;
    }
    if (error instanceof z.ZodError) {
      const issue = error.issues[0];
      throw new Error(`Notion 데이터 형식 오류 (${issue?.code}, ${issue?.path.join(".") || "값"})`);
    }
    throw new Error("Notion 조회 또는 공개 데이터 검증 실패");
  });
  return snapshot;
}
export const href = (path = "") =>
  import.meta.env.BASE_URL.replace(/\/$/, "") + "/" + path;
export const displayDate = (value: string) =>
  value.slice(0, 10).replaceAll("-", ". ");
