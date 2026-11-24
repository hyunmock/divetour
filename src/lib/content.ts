import { getSecret } from "astro:env/server";
import { readNotion, type SiteContent } from "./notion";
let snapshot: Promise<SiteContent> | undefined;
export function content() {
  snapshot ??= readNotion(
    Object.fromEntries(
      [
        "TOKEN",
        "TOURS_DATABASE_ID",
        "FAQ_DATABASE_ID",
        "MEDIA_DATABASE_ID",
        "ABOUT_PAGE_ID",
        "JOIN_PAGE_ID",
        "RULES_PAGE_ID",
      ].map((s) => {
        const key = "NOTION_" + s;
        return [key, getSecret(key)];
      }),
    ),
  ).catch(() => {
    // 원본 응답이나 인증 정보를 빌드 로그에 남기지 않습니다.
    throw new Error(
      "Notion 조회 또는 공개 데이터 검증 실패. 빌드 환경 설정과 원본을 확인하세요.",
    );
  });
  return snapshot;
}
export const href = (path = "") =>
  import.meta.env.BASE_URL.replace(/\/$/, "") + "/" + path;
export const displayDate = (value: string) =>
  value.slice(0, 10).replaceAll("-", ". ");
