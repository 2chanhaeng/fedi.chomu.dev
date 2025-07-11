import { Context } from "@hono/hono";
import { BlankEnv, BlankInput } from "@hono/hono/types";

// 로그아웃 처리
export default function AuthLogoutGet(
  c: Context<BlankEnv, "/auth/logout", BlankInput>,
): Response {
  // 세션 쿠키 삭제
  c.header("Set-Cookie", "user_id=; HttpOnly; Path=/; Max-Age=0");

  return c.redirect("/");
}
