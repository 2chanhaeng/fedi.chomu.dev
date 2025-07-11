import { AuthUser } from "@/types/auth.ts";
import { Context, Next } from "@hono/hono";
import { getCookie } from "@hono/hono/cookie";
import prisma from "prisma";
import { ErrorWithState } from "./error.ts";

export interface AuthContext {
  user?: AuthUser;
}

/**
 * Middleware to authenticate the user based on the session cookie.
 * If the user is authenticated, it sets the user in the context.
 * If not authenticated, the user will be undefined.
 * @param {Context} c - Hono context
 * @param {Next} next - Next middleware function
 * @returns {Promise<void>} - Resolves when the next middleware is called
 */
export async function authMiddleware(c: Context, next: Next): Promise<void> {
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

/**
 * Require authentication middleware.
 * Redirects to login if the user is not authenticated.
 * @param {Context} c - Hono context
 * @param {Next} next - Next middleware function
 * @returns {Promise<void>} - Resolves when the next middleware is called
 */
export async function requireAuth(
  c: Context,
  next: Next,
): Promise<void | Response> {
  const user = c.get("user");

  if (!user) {
    return c.redirect("/auth/login");
  }

  await next();
}

/**
 * Get current user information
 * @param {Context} c - Hono context
 * @returns {AuthUser | undefined} - The authenticated user or undefined if not authenticated
 */
export const getCurrentUser = (c: Context): AuthUser | undefined =>
  c.get("user");

/**
 * Get current user or throw an error if not authenticated.
 * @param {Context} c - Hono context
 * @returns {AuthUser} - The authenticated user
 * @throws {Error} - If the user is not authenticated
 */
export const ensureCurrentUser = (c: Context): AuthUser =>
  c.get("user") ?? new UnauthError().throw();

class UnauthError extends ErrorWithState {
  constructor() {
    super("User is not authenticated", 401);
    this.name = "AuthError";
  }
}
