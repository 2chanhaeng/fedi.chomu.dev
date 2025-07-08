import { Hono } from "@hono/hono";
import { getLogger } from "@logtape/logtape";
import { expandGlobSync } from "@std/fs";
import { dirname } from "@std/path";
import { get } from "utils";

const logger = getLogger("fedify-example");

const router = new Hono();

// 현재 파일의 디렉토리 경로 가져오기
const currentDir = dirname(import.meta.url).replace("file://", "");

// 라우터 설정을 위한 비동기 함수
async function setupRoutes(router: Hono) {
  const globOptions = { root: currentDir, globstar: true };
  const paths = ["**/page.tsx", "**/get.ts", "**/post.ts"]
    .map((pattern) => expandGlobSync(pattern, globOptions)) //
    .flatMap((entry) => Array.from(entry))
    .filter(get("isFile"))
    .map(get("path"));

  const entries = await Promise.all(paths.map(getModule));
  entries.forEach(({ method, path, module }) =>
    router[method](path, module.default || module)
  );
}

const assignMethod = (path: string): "get" | "post" =>
  path.endsWith("page.tsx") ? "get" : path.endsWith("get.ts") ? "get" : "post";
const pickPath = (path: string, root: string = currentDir): string =>
  path.replace(root, "")
    .replace(/\\/g, "/") // Windows 경로 구분자 처리
    .replace(/\/page\.tsx$/, "") // page.tsx 제거
    .replace(/\/get\.ts$/, "") // get.ts 제거
    .replace(/\/post\.ts$/, "") // post.ts 제거
    .replace(/^$/, "/"); // 빈 경로를 루트로 변경
const getModule = async (path: string) => ({
  method: assignMethod(path),
  path: pickPath(path),
  module: await import(path),
});

// 라우터 설정 실행
await setupRoutes(router);

export default router;
