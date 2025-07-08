import { Hono } from "@hono/hono";
import { getLogger } from "@logtape/logtape";
import { expandGlob } from "@std/fs";
import { dirname } from "@std/path";

const logger = getLogger("fedify-example");

const router = new Hono();

// 현재 파일의 디렉토리 경로 가져오기
const currentDir = dirname(import.meta.url).replace("file://", "");

// 라우터 설정을 위한 비동기 함수
async function setupRoutes(router: Hono) {
  const patterns = ["**/page.tsx", "**/get.ts", "**/post.ts"];

  for (const pattern of patterns) {
    // expandGlob을 사용해서 파일 검색
    for await (
      const entry of expandGlob(pattern, {
        root: currentDir,
        globstar: true,
      })
    ) {
      if (entry.isFile) {
        // 파일 경로에서 라우트 경로 생성
        const relativePath = entry.path.replace(currentDir, "");
        const routePath = relativePath
          .replace(/\\/g, "/") // Windows 경로 구분자 처리
          .replace(/\/page\.tsx$/, "") // page.tsx 제거
          .replace(/\/get\.ts$/, "") // get.ts 제거
          .replace(/\/post\.ts$/, "") // post.ts 제거
          .replace(/^$/, "/"); // 빈 경로를 루트로 변경

        try {
          // 파일을 동적으로 import
          const module = await import(entry.path);

          if (pattern.endsWith("page.tsx") || pattern.endsWith("get.ts")) {
            // GET 라우트 설정
            router.get(routePath, module.default || module);
          } else if (pattern.endsWith("post.ts")) {
            // POST 라우트 설정
            router.post(routePath, module.default || module);
          }
        } catch (error) {
          logger.error(`Failed to import ${entry.path}:`);
          logger.error(String(error));
        }
      }
    }
  }
}

// 라우터 설정 실행
await setupRoutes(router);

export default router;
