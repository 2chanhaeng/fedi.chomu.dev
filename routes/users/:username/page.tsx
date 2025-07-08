import Layout from "@/components/Layout.tsx";
import PostList from "@/components/PostList.tsx";
import Profile from "@/components/Profile.tsx";
import { userInclude } from "@/lib/queries.ts";
import { Context } from "@hono/hono";
import { BlankEnv, BlankInput } from "@hono/hono/types";
import prisma from "prisma";

export default async function UserPage(
  c: Context<BlankEnv, "/users/:username", BlankInput>,
): Promise<Response> {
  const username = c.req.param("username");
  const user = await prisma.user.findUnique({
    where: { username },
    include: userInclude.actor.folCountPosts,
  }).then((user) => user?.actor ? { ...user, actor: user.actor! } : null);
  if (!user) return c.notFound();

  const { actor } = user;
  const posts = actor.posts.map((post) => ({ ...post, actor }));

  return c.html(
    <Layout>
      <Profile username={username} actor={actor} />
      <PostList posts={posts} />
    </Layout>,
  );
}
