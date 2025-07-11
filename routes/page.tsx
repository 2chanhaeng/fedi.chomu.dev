import Home from "@/components/Home.tsx";
import Layout from "@/components/Layout.tsx";
import { getCurrentUser } from "@/lib/auth.ts";
import { newerAhead } from "@/lib/queries.ts";
import { Context } from "@hono/hono";
import { BlankEnv, BlankInput } from "@hono/hono/types";
import prisma from "prisma";

export default async function HomePage(
  c: Context<BlankEnv, "/", BlankInput>,
): Promise<Response> {
  const currentUser = getCurrentUser(c);
  const user = currentUser
    ? await prisma.user.findUnique({
      where: { id: currentUser.id },
      include: { actor: true },
    }).then((user) => user?.actor ? { ...user, actor: user.actor! } : undefined)
    : undefined;

  const posts = await prisma.post.findMany({
    include: { actor: true },
    ...newerAhead,
  });

  return c.html(
    <Layout user={currentUser}>
      <Home user={user} posts={posts} />
    </Layout>,
  );
}
