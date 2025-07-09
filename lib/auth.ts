import { Context, Next } from "@hono/hono";
import { getCookie } from "@hono/hono/cookie";
import prisma from "prisma";

export interface AuthContext {
  user?: {
    id: string;
    username: string;
    actor?: {
      id: string;
      name: string | null;
      handle: string;
    };
  };
}

// 인증 미들웨어
export async function authMiddleware(c: Context, next: Next) {
  const userId = getCookie(c, "user_id");

  if (userId) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { actor: true },
      });

      if (user) {
        c.set("user", user);
      }
    } catch (error) {
      console.error("Auth middleware error:", error);
    }
  }

  await next();
}

// 인증 필수 미들웨어
export async function requireAuth(c: Context, next: Next) {
  const user = c.get("user");

  if (!user) {
    return c.redirect("/auth/github");
  }

  await next();
}

// 현재 사용자 정보 가져오기 헬퍼
export function getCurrentUser(c: Context): AuthContext["user"] | undefined {
  return c.get("user");
}
