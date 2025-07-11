import { ensureCookie } from "@/lib/cookie.ts";
import { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET } from "@/lib/env.ts";
import { ErrorWithState } from "@/lib/error.ts";
import {
  deleteOAuthState,
  getOrCreateOAuthUser,
  setUserID,
} from "@/lib/oauth.ts";
import { ProviderUser, TokenResponse } from "@/types/oauth.ts";
import { Context } from "@hono/hono";
import { BlankEnv, BlankInput } from "@hono/hono/types";
import { getLogger } from "@logtape/logtape";

const logger = getLogger("fedi-example");

// GitHub OAuth 콜백 처리
export default async function AuthGitHubCallbackGet(
  c: Context<BlankEnv, "/auth/github/callback", BlankInput>,
): Promise<Response> {
  try {
    verifyState(c); // CSRF 보호를 위한 state 검증
    const code = c.req.query("code") ??
      new AuthorizationCodeNotFoundError().throw();

    // 1. Access Token 획득 (code가 존재함을 보장)
    const tokens = await fetchToken(
      GITHUB_CLIENT_ID,
      GITHUB_CLIENT_SECRET,
      code,
    );

    // 2. 사용자 정보 가져오기
    const providerUser = await fetchUser(tokens.access_token);

    const { login: username } = providerUser;

    // 3. 사용자 계정 생성 또는 업데이트
    const user = await getOrCreateOAuthUser(
      "github",
      providerUser,
      tokens,
      new URL(c.req.url).host,
    );

    // 4. 세션 설정 (간단한 쿠키 기반)
    setUserID(c, user.id);
    deleteOAuthState(c);

    return c.redirect(`/users/${username}`);
  } catch (error) {
    if (error instanceof ErrorWithState) {
      return c.text(error.message, error.state);
    }
    logger.error("Unknown GitHub OAuth error", { error });
    return c.text("Authentication failed", 500);
  }
}
/**
 * Verify the state parameter to prevent CSRF attacks.
 * @param {Context} c - Hono context
 * @returns {void} - No return value, throws an error if verification fails
 * @throws {InvalidStateError} - If the state parameter does not match the stored value
 */
const verifyState = (c: Context) => {
  const state = c.req.query("state");
  const storedState = ensureCookie(c, "oauth_state");
  if (state !== storedState) new InvalidStateError().throw();
};

/**
 * Fetch the access token from GitHub using the provided client ID, client secret, and authorization code.
 * @param {string} client_id - The client ID of the GitHub app
 * @param {string} client_secret - The client secret of the GitHub app
 * @param {string} code - The authorization code received from GitHub
 * @returns {Promise<TokenResponse>} - The access token response from GitHub
 * @throws {AccessTokenError} - If the token request fails
 */
const fetchToken = (
  client_id: string,
  client_secret: string,
  code: string,
): Promise<TokenResponse> =>
  fetch(
    "https://github.com/login/oauth/access_token",
    {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id,
        client_secret,
        code,
      }),
    },
  ).then((res) => res.json() as Promise<TokenResponse>)
    .catch(() => new AccessTokenError().throw());

/**
 * Fetch user data from GitHub using the access token.
 * @param {string} accessToken - The access token obtained from GitHub
 * @returns {Promise<ProviderUser>} - The user data from GitHub
 * @throws {UserDataError} - If the user data request fails
 */
const fetchUser = (accessToken: string): Promise<ProviderUser> =>
  fetch("https://api.github.com/user", {
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Accept": "application/vnd.github.v3+json",
    },
  }).then((res) => res.json() as Promise<ProviderUser>)
    .catch(() => new UserDataError().throw());

/** Error for invalid state parameter */
class InvalidStateError extends ErrorWithState {
  constructor() {
    super("Invalid state parameter", 400);
  }
}

/** Error for missing authorization code */
class AuthorizationCodeNotFoundError extends ErrorWithState {
  constructor() {
    super("Authorization code not found", 400);
  }
}

/** Error for failed access token retrieval */
class AccessTokenError extends ErrorWithState {
  constructor() {
    super("Failed to get access token", 400);
  }
}

/** Error for failed user data retrieval */
class UserDataError extends ErrorWithState {
  constructor() {
    super("Failed to fetch user data", 400);
  }
}
