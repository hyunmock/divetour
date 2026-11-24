import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://hyunmock.github.io",
  base: "/divetour",
  output: "static",
  // 임시 홈페이지에는 공개 승인을 검토할 기존 자료를 복사하지 않습니다.
  vite: { publicDir: false },
});
