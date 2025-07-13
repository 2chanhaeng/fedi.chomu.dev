import fedi from "@/federation/mod.ts";
import { ensureCurrentUser } from "@/lib/auth.ts";
import { ErrorWithState } from "@/lib/error.ts";
import { Follow, isActor, lookupObject } from "@fedify/fedify";
import { Context } from "@hono/hono";
import { BlankEnv, BlankInput } from "@hono/hono/types";

export default async function UserFollowingPost(
  c: Context<BlankEnv, "/users/:username/following", BlankInput>,
): Promise<Response> {
  try {
    const { username } = ensureCurrentUser(c);
    const form = await c.req.formData();
    const handle = form.get("actor");
    if (typeof handle !== "string") {
      throw new ActorNotFoundError();
    }
    const ctx = fedi.createContext(c.req.raw, undefined);
    const actor = await lookupObject(handle.trim());
    if (!isActor(actor)) {
      throw new ActorNotFoundError();
    }
    const actorId = actor.id;
    const followId = new URL(
      `#Follow/${crypto.randomUUID()}`,
      ctx.getActorUri(username),
    );
    await ctx.sendActivity(
      { identifier: username },
      actor,
      new Follow({
        id: followId,
        actor: ctx.getActorUri(username),
        object: actorId,
        to: actorId,
      }),
    );
    return c.redirect("/");
  } catch (error) {
    if (error instanceof ErrorWithState) {
      return c.text(error.message, error.state);
    }
    console.error("Error in UserFollowingPost:", error);
    return c.text("Failed to follow the user", 500);
  }
}

/**
 * Error for when the actor is not found or invalid.
 */
class ActorNotFoundError extends ErrorWithState {
  constructor() {
    super("Actor not found or invalid", 401);
    this.name = "ActorNotFoundError";
  }
}
