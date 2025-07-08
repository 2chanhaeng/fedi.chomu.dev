import Home from "@/components/Home.tsx";
import Layout from "@/components/Layout.tsx";
import { newerAhead } from "@/lib/queries.ts";
import { Context } from "@hono/hono";
import { BlankEnv, BlankInput } from "@hono/hono/types";
import prisma from "prisma";

export default async function UsersPage(
  c: Context<BlankEnv, "/", BlankInput>,
): Promise<Response> {
  const user = await prisma.user.findFirst({
    include: { actor: true },
  }).then((user) => user?.actor ? { ...user, actor: user.actor! } : null);
  if (!user) return c.redirect("/");

  const posts = await prisma.post.findMany({
    include: { actor: true },
    ...newerAhead,
  });

  const postsWithFlattenedActor = posts.map((post) => ({
    ...post,
    ...post.actor,
  }));

  return c.html(
    <Layout>
      <Home user={user} posts={postsWithFlattenedActor} />
    </Layout>,
  );
}
