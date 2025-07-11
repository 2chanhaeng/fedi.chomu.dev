import { Context } from "@hono/hono";
import { getCookie } from "@hono/hono/cookie";

export class NotFoundCookieError extends Error {
  constructor(name: string) {
    super(`Cookie not found: ${name}`);
    this.name = "NotFoundCookieError";
  }
  throw(): never {
    throw this;
  }
}

/**
 * Get a cookie value, or throw an error if not found.
 * @param {Context} c - Hono context
 * @param {string} - Cookie name
 * @returns {string} - Cookie value
 * @throws {NotFoundCookieError} - If the cookie is not found
 */
export const ensureCookie = (c: Context, name: string): string =>
  getCookie(c, name) ?? new NotFoundCookieError(name).throw();
