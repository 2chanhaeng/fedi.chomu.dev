import fedi from "@/federation/mod.ts";
import { Follow, isActor, lookupObject } from "@fedify/fedify";
import { Context } from "@hono/hono";
import { BlankEnv, BlankInput } from "@hono/hono/types";

export default async function UserFollowingPost(
  c: Context<BlankEnv, "/users/:username/following", BlankInput>,
): Promise<Response> {
  const username = c.req.param("username");
  const form = await c.req.formData();
  const handle = form.get("actor");
  if (typeof handle !== "string") {
    return c.text("Invalid actor handle or URL", 400);
  }
  const ctx = fedi.createContext(c.req.raw, undefined);
  const actor = await lookupObject(handle.trim());
  if (!isActor(actor)) {
    return c.text("Invalid actor handle or URL", 400);
  }
  await ctx.sendActivity(
    { identifier: username },
    actor,
    new Follow({
      actor: ctx.getActorUri(username),
      object: actor.id,
      to: actor.id,
    }),
  );
  return c.text("Successfully sent a follow request");
}
