import { Note } from "@fedify/fedify";
import { federation } from "@fedify/fedify/x/hono";
import { Hono } from "@hono/hono";
import { getLogger } from "@logtape/logtape";
import { stringifyEntities } from "stringify-entities";
import db from "./db.ts";
import fedi from "./federation.ts";
import type { Actor, Post, User } from "./schema.ts";
import {
  FollowerList,
  Home,
  Layout,
  PostPage,
  Profile,
  SetupForm,
} from "./views.tsx";

const logger = getLogger("fedify-example");

const app = new Hono();

app.use(federation(fedi, () => undefined));
app.post("/setup", async (c) => {
  // 계정이 이미 있는지 검사
  const user = db.prepare(`
    SELECT * FROM users
    JOIN actors ON (users.id = actors.user_id)
    LIMIT 1
    `).get<User & Actor>();
  if (user !== undefined) return c.redirect("/");

  const form = await c.req.formData();
  const username = form.get("username");
  if (typeof username !== "string" || !username.match(/^[a-z0-9_-]{1,50}$/)) {
    return c.redirect("/setup");
  }
  const name = form.get("name");
  if (typeof name !== "string" || name.trim() === "") {
    return c.redirect("/setup");
  }
  const url = new URL(c.req.url);
  const handle = `@${username}@${url.host}`;
  const ctx = fedi.createContext(c.req.raw, undefined);
  db.transaction(() => {
    db.prepare(
      "INSERT OR REPLACE INTO users (id, username) VALUES (1, ?)",
    ).run(username);
    db.prepare(
      `
      INSERT OR REPLACE INTO actors
        (user_id, uri, handle, name, inbox_url, shared_inbox_url, url)
      VALUES (1, ?, ?, ?, ?, ?, ?)
    `,
    ).run(
      ctx.getActorUri(username).href,
      handle,
      name,
      ctx.getInboxUri(username).href,
      ctx.getInboxUri().href,
      ctx.getActorUri(username).href,
    );
  })();
  return c.redirect("/");
});
app.get("/setup", (c) => {
  // 계정이 이미 있는지 검사
  const user = db.prepare(
    "SELECT * FROM users JOIN actors ON (users.id = actors.user_id) LIMIT 1",
  ).get<User & Actor>();
  if (user !== undefined) return c.redirect("/");

  return c.html(
    <Layout>
      <SetupForm />
    </Layout>,
  );
});
app.get("/users/:username/followers", async (c) => {
  const followers = db
    .prepare(
      `
      SELECT followers.*
      FROM follows
      JOIN actors AS followers ON follows.follower_id = followers.id
      JOIN actors AS following ON follows.following_id = following.id
      JOIN users ON users.id = following.user_id
      WHERE users.username = ?
      ORDER BY follows.created DESC
      `,
    )
    .all<Actor>(c.req.param("username"));
  return c.html(
    <Layout>
      <FollowerList followers={followers} />
    </Layout>,
  );
});
app.get("/users/:username/posts/:id", (c) => {
  const post = db
    .prepare(
      `
      SELECT users.*, actors.*, posts.*
      FROM posts
      JOIN actors ON actors.id = posts.actor_id
      JOIN users ON users.id = actors.user_id
      WHERE users.username = ? AND posts.id = ?
      `,
    )
    .get<Post & Actor & User>(c.req.param("username"), c.req.param("id"));
  if (post == null) return c.notFound();

  // biome-ignore lint/style/noNonNullAssertion: 언제나 하나의 레코드를 반환
  const { followers } = db
    .prepare(
      `
      SELECT count(*) AS followers
      FROM follows
      WHERE follows.following_id = ?
      `,
    )
    .get<{ followers: number }>(post.actor_id)!;
  return c.html(
    <Layout>
      <PostPage
        name={post.name ?? post.username}
        username={post.username}
        handle={post.handle}
        followers={followers}
        post={post}
      />
    </Layout>,
  );
});
app.post("/users/:username/posts", async (c) => {
  const username = c.req.param("username");
  const actor = db
    .prepare(
      `
      SELECT actors.*
      FROM actors
      JOIN users ON users.id = actors.user_id
      WHERE users.username = ?
      `,
    )
    .get<Actor>(username);
  if (actor == null) return c.redirect("/setup");
  const form = await c.req.formData();
  const content = form.get("content")?.toString();
  if (content == null || content.trim() === "") {
    return c.text("Content is required", 400);
  }
  const ctx = fedi.createContext(c.req.raw, undefined);
  const url: string | null = db.transaction(() => {
    const post = db
      .prepare(
        `
        INSERT INTO posts (uri, actor_id, content)
        VALUES ('https://localhost/', ?, ?)
        RETURNING *
        `,
      )
      .get<Post>(actor.id, stringifyEntities(content, { escapeOnly: true }));
    if (post == null) return null;
    const url = ctx.getObjectUri(Note, {
      identifier: username,
      id: post.id.toString(),
    }).href;
    db.prepare("UPDATE posts SET uri = ?, url = ? WHERE id = ?").run(
      url,
      url,
      post.id,
    );
    return url;
  })();
  if (url == null) return c.text("Failed to create post", 500);
  return c.redirect(url);
});
app.get("/users/:username", async (c) => {
  const user = db
    .prepare(
      "SELECT * FROM users JOIN actors ON (users.id = actors.user_id) WHERE username = ?",
    )
    .get<User & Actor>(c.req.param("username"));
  if (user == null) return c.notFound();

  const { followers } = db
    .prepare(
      `
      SELECT count(*) AS followers
      FROM follows
      JOIN actors ON follows.following_id = actors.id
      WHERE actors.user_id = ?
      `,
    )
    .get<{ followers: number }>(user.id)!;

  const url = new URL(c.req.url);
  const handle = `@${user.username}@${url.host}`;
  return c.html(
    <Layout>
      <Profile
        name={user.name ?? user.username}
        username={user.username}
        handle={handle}
        followers={followers}
      />
    </Layout>,
  );
});
app.get("/", (c) => {
  const user = db
    .prepare(
      `
      SELECT users.*, actors.*
      FROM users
      JOIN actors ON users.id = actors.user_id
      LIMIT 1
      `,
    )
    .get<User & Actor>();
  if (user == null) return c.redirect("/setup");

  return c.html(
    <Layout>
      <Home user={user} />
    </Layout>,
  );
});

export default app;
