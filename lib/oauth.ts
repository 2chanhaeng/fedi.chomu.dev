import { ProviderUser, TokenResponse } from "@/types/oauth.ts";
import { Context } from "@hono/hono";
import { deleteCookie, getCookie, setCookie } from "@hono/hono/cookie";
import prisma, { Prisma, User } from "prisma";
import { ensureCookie, NotFoundCookieError } from "./cookie.ts";

/**
 * Get or create an OAuth user
 * @param {string} provider - OAuth provider name (e.g., 'github')
 * @param {ProviderUser} providerUser - User data from the OAuth provider
 * @param {TokenResponse} tokens - Token data from the OAuth provider
 * @param {string} host - Hostname for constructing URLs
 * @returns {Promise<User>} - The created or existing user
 */
export async function getOrCreateOAuthUser(
  provider: string,
  providerUser: ProviderUser,
  tokens: TokenResponse,
  host: string,
): Promise<User> {
  const where = getWhere(provider, providerUser.id);
  const user = await getOAuthUserWithUpdate(where, tokens) ??
    await createOAuthUser(provider, providerUser, tokens, host);
  return user;
}

/**
 * Get where clause to find an OAuth user
 * @param {string} provider - OAuth provider name (e.g., 'github')
 * @param {unknown} providerAccountId - Provider account ID
 * @returns {Prisma.AccountWhereUniqueInput} - The where clause for Prisma query
 */
const getWhere = (
  provider: string,
  providerAccountId: unknown,
): Prisma.AccountWhereUniqueInput => ({
  provider_providerAccountId: {
    provider,
    providerAccountId: String(providerAccountId),
  },
});

/**
 * Get OAuth user with update tokens if exists
 * @param {Prisma.AccountWhereUniqueInput} where - The where clause to find the user
 * @param {TokenResponse} tokens - The tokens to update
 * @returns {Promise<User | null>} - The user if exists, otherwise null
 */
async function getOAuthUserWithUpdate(
  where: Prisma.AccountWhereUniqueInput,
  tokens: TokenResponse,
): Promise<User | null> {
  const user = await prisma.account.findUnique({ where }).user();
  // If user exists, update the account with new tokens
  if (user) await prisma.account.update({ where, data: tokens });
  return user;
}

/**
 * Create a new OAuth user
 * @param {string} provider - OAuth provider name (e.g., 'github')
 * @param {ProviderUser} userData - User data from the OAuth provider
 * @param {TokenResponse} tokenData - Token data from the OAuth provider
 * @param {string} host - Hostname for constructing URLs
 * @returns {Promise<User>} - The created user
 */
async function createOAuthUser(
  provider: string,
  userData: ProviderUser,
  tokenData: TokenResponse,
  host: string,
): Promise<User> {
  const { login: username } = userData;
  const userUrl = `https://${host}/users/${username}`;
  const actor = {
    create: {
      uri: userUrl,
      handle: `@${username}@${host}`,
      name: userData.name || username,
      inboxUrl: `${userUrl}/inbox`,
      sharedInboxUrl: `https://${host}/inbox`,
      url: userUrl,
      avatar: userData.avatar_url,
    },
  };

  const accounts = {
    create: {
      type: "oauth",
      provider,
      providerAccountId: userData.id.toString(),
      ...tokenData,
    },
  };

  return await prisma.user.create({ data: { username, actor, accounts } });
}
/**
 * Set OAuth state
 * @param {Context} c - Hono context
 * @param {unknown} state - State to set
 * @returns {void}
 */
export function setOAuthState(c: Context, state: unknown): void {
  setCookie(
    c,
    "oauth_state",
    String(state),
    {
      httpOnly: true,
      path: "/",
      maxAge: 600,
    },
  );
}

/**
 * Get OAuth state
 * @param {Context} c - Hono context
 * @returns {string | undefined} - The OAuth state or undefined if not set
 */
export function getOAuthState(c: Context): string | undefined {
  return ensureCookie(c, "oauth_state");
}

/**
 * Delete OAuth state
 * @param {Context} c - Hono context
 * @returns {void}
 */
export function deleteOAuthState(c: Context): void {
  deleteCookie(c, "oauth_state", { path: "/" });
}

/**
 * Set user ID in cookie
 * @param {Context} c - Hono context
 * @param {string} userId - User ID to set
 * @returns {void}
 */
export function setUserID(c: Context, userId: unknown): void {
  setCookie(
    c,
    "user_id",
    String(userId),
    {
      httpOnly: true,
      path: "/",
      maxAge: 86400,
    },
  );
}

/**
 * Get user ID from cookie
 * @param {Context} c - Hono context
 * @returns {string | undefined} - The user ID or undefined if not set
 */
export function getUserID(c: Context): string | undefined {
  return getCookie(c, "user_id");
}

/**
 * Get user ID from cookie or throw an error if not found
 * @param {Context} c - Hono context
 * @returns {string} - The user ID
 * @throws {NotFoundCookieError} - If the user ID cookie is not found
 */
export function ensureUserID(c: Context): string {
  return getCookie(c, "user_id") ?? new NotFoundCookieError("user_id").throw();
}

/**
 * OAuth user remover
 * @param {Context} c - Hono context
 * @returns {void}
 */
export function deleteOAuthUser(c: Context): void {
  deleteCookie(c, "user_id", { path: "/" });
}
