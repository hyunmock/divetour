import { access, cp } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "astro/config";

const assets = "public/assets";
const types = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".pdf": "application/pdf",
};

function serveAssets() {
  return {
    name: "serve-notion-assets",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const path = req.url?.split("?")[0] ?? "";
        const at = path.indexOf("/assets/");
        if (at < 0) return next();
        const rel = decodeURIComponent(path.slice(at + "/assets/".length));
        if (!rel || rel.split("/").some((part) => !part || part === "." || part === ".."))
          return next();
        const file = join(assets, rel);
        try {
          await access(file);
        } catch {
          return next();
        }
        res.setHeader(
          "Content-Type",
          types[extname(file).toLowerCase()] ?? "application/octet-stream",
        );
        createReadStream(file).pipe(res);
      });
    },
  };
}

export default defineConfig({
  site: "https://hyunmock.github.io",
  base: "/divetour",
  output: "static",
  // 임시 홈페이지에는 공개 승인을 검토할 기존 자료를 복사하지 않습니다.
  // Notion에서 받은 파일만 public/assets에 두고 빌드 결과에 넣습니다.
  vite: { publicDir: false, plugins: [serveAssets()] },
  integrations: [
    {
      name: "copy-notion-assets",
      hooks: {
        "astro:build:done": async ({ dir }) => {
          try {
            await cp(assets, join(fileURLToPath(dir), "assets"), { recursive: true });
          } catch (error) {
            if (error?.code !== "ENOENT") throw error;
          }
        },
      },
    },
  ],
});
