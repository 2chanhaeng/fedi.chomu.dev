import fedi from "@/federation/mod.ts";
import { Create, Note } from "@fedify/fedify";
import { Context } from "@hono/hono";
import { BlankEnv, BlankInput } from "@hono/hono/types";
import prisma from "prisma";
import { stringifyEntities } from "stringify-entities";

export default async function PostPost(
  c: Context<BlankEnv, "/users/:username/posts", BlankInput>,
): Promise<Response> {
  const username = c.req.param("username");
  const user = await prisma.user.findUnique({
    where: { username },
    include: { actor: true },
  });
  const actor = user?.actor;
  if (!actor) return c.redirect("/");
  const form = await c.req.formData();
  const content = form.get("content")?.toString();
  if (content == null || content.trim() === "") {
    return c.text("Content is required", 400);
  }
  const ctx = fedi.createContext(c.req.raw, undefined);

  // Create post with temporary URI
  const post = await prisma.post.create({
    data: {
      uri: "https://fedi.chomu.dev/",
      actorId: actor.id,
      content: stringifyEntities(content, { escapeOnly: true }),
    },
  });

  // Update with proper URI
  const url = ctx.getObjectUri(Note, {
    identifier: username,
    id: post.id,
  }).href;

  await prisma.post.update({
    where: { id: post.id },
    data: { uri: url, url },
  });

  const noteArgs = { identifier: username, id: post.id };
  const note = await ctx.getObject(Note, noteArgs);
  await ctx.sendActivity(
    { identifier: username },
    "followers",
    new Create({
      id: new URL("#activity", note?.id ?? undefined),
      object: note,
      actors: note?.attributionIds,
      tos: note?.toIds,
      ccs: note?.ccIds,
    }),
  );
  return c.redirect(ctx.getObjectUri(Note, noteArgs).href);
}
