import Layout from "@/components/Layout.tsx";
import PostList from "@/components/PostList.tsx";
import { Context } from "@hono/hono";
import { BlankEnv, BlankInput } from "@hono/hono/types";
import prisma from "prisma";

export default async function PostPost(
  c: Context<BlankEnv, "/users/:username/posts", BlankInput>,
): Promise<Response> {
  const username = c.req.param("username");
  const actor = await prisma.user //
    .findUnique({ where: { username } }) //
    .actor({ include: { posts: true } });
  if (!actor) return c.notFound();
  const posts = actor.posts.map((post) => ({ ...post, actor }));

  return c.html(
    <Layout>
      <h1>Posts by {actor?.handle ?? username}</h1>
      <PostList posts={posts} />
    </Layout>,
  );
}
