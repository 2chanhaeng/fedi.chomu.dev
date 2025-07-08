import { Create, Follow, isActor, lookupObject, Note } from "@fedify/fedify";
import { federation } from "@fedify/fedify/x/hono";
import { Hono } from "@hono/hono";
import { getLogger } from "@logtape/logtape";
import prisma from "prisma";
import { stringifyEntities } from "stringify-entities";
import fedi from "./federation.ts";
import {
  FollowerList,
  FollowingList,
  Home,
  Layout,
  PostList,
  PostPage,
  Profile,
  SetupForm,
} from "./views.tsx";

const logger = getLogger("fedify-example");

const app = new Hono();

app.use(federation(fedi, () => undefined));
app.get("/users/:username/followers", async (c) => {
  const username = c.req.param("username");
  const user = await prisma.user.findUnique({
    where: { username },
    include: {
      actor: {
        include: { followers: { include: { follower: true } } },
      },
    },
  });
  if (!user?.actor) return c.notFound();
  const followers = user.actor.followers.map((f) => f.follower);

  return c.html(
    <Layout>
      <FollowerList followers={followers} />
    </Layout>,
  );
});
app.get("/users/:username/following", async (c) => {
  const username = c.req.param("username");
  const user = await prisma.user.findUnique({
    where: { username },
    include: {
      actor: {
        include: { following: { include: { following: true } } },
      },
    },
  });
  if (!user?.actor) return c.notFound();
  const following = user.actor.following.map((f) => f.following);

  return c.html(
    <Layout>
      <FollowingList following={following} />
    </Layout>,
  );
});
app.post("/users/:username/following", async (c) => {
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
});
app.get("/users/:username/posts/:id", async (c) => {
  const username = c.req.param("username");
  const id = c.req.param("id");
  const post = await prisma.post.findUnique({
    where: { id, actor: { user: { username } } },
    include: {
      actor: {
        include: { _count: { select: { following: true, followers: true } } },
      },
    },
  });
  if (post == null) return c.notFound();

  const { name, handle, _count: { following, followers } } = post.actor;
  return c.html(
    <Layout>
      <PostPage
        name={name ?? username}
        username={username}
        handle={handle}
        following={following}
        followers={followers}
        post={{ ...post.actor, ...post }}
      />
    </Layout>,
  );
});
app.post("/users/:username/posts", async (c) => {
  const username = c.req.param("username");
  const user = await prisma.user.findUnique({
    where: { username },
    include: { actor: true },
  });
  const actor = user?.actor;
  if (!actor) return c.redirect("/setup");
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
});
app.get("/users/:username", async (c) => {
  const username = c.req.param("username");
  const user = await prisma.user.findUnique({
    where: { username },
    include: {
      actor: {
        include: {
          _count: {
            select: { followers: true, following: true },
          },
          posts: {
            orderBy: { created: "desc" },
            include: { actor: true },
          },
        },
      },
    },
  });
  if (user?.actor == null) return c.notFound();

  const { followers, following } = user.actor._count;
  const posts = user.actor.posts.map((post) => ({
    ...post,
    ...post.actor, // Flatten actor properties into post
  }));

  const url = new URL(c.req.url);
  const handle = `@${user.username}@${url.host}`;
  return c.html(
    <Layout>
      <Profile
        name={user.actor.name ?? user.username}
        username={user.username}
        handle={handle}
        following={following}
        followers={followers}
      />
      <PostList posts={posts} />
    </Layout>,
  );
});
app.get("/", async (c) => {
  const user = await prisma.user.findFirst({
    include: { actor: true },
  });
  if (user?.actor == null) return c.redirect("/setup");

  const posts = await prisma.post.findMany({
    include: { actor: true },
    orderBy: { created: "desc" },
  });

  const postsWithFlattenedActor = posts.map((post) => ({
    ...post,
    ...post.actor,
  }));

  return c.html(
    <Layout>
      <Home user={{ ...user, ...user.actor }} posts={postsWithFlattenedActor} />
    </Layout>,
  );
});

export default app;
