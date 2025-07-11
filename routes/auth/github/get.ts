import { GITHUB_CALLBACK_URL, GITHUB_CLIENT_ID } from "@/lib/env.ts";
import { setOAuthState } from "@/lib/oauth.ts";
import { Context } from "@hono/hono";
import { BlankEnv, BlankInput } from "@hono/hono/types";

/**
 * GitHub OAuth 인증을 위한 URL 생성 및 리다이렉트
 * @param {Context} c - Hono context
 * @returns {Response} - Redirect response to GitHub OAuth authorization URL
 */
export default function AuthGitHubGet(
  c: Context<BlankEnv, "/auth/github", BlankInput>,
): Response {
  const state = crypto.randomUUID();
  setOAuthState(c, state);

  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    redirect_uri: GITHUB_CALLBACK_URL,
    state,
  });

  const githubAuthUrl = `https://github.com/login/oauth/authorize?${params}`;

  return c.redirect(githubAuthUrl);
}
