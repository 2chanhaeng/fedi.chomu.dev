import Layout from "@/components/Layout.tsx";
import PostPageComp from "@/components/PostPage.tsx";
import { actorFolCount } from "@/lib/queries.ts";
import { Context } from "@hono/hono";
import { BlankEnv, BlankInput } from "@hono/hono/types";
import prisma from "prisma";

export default async function PostPage(
  c: Context<BlankEnv, "/users/:username/posts/:id", BlankInput>,
): Promise<Response> {
  const username = c.req.param("username");
  const id = c.req.param("id");
  const post = await prisma.post.findUnique({
    where: { id, actor: { user: { username } } },
    ...actorFolCount,
  });
  if (post == null) return c.notFound();
  return c.html(
    <Layout>
      <PostPageComp post={post} username={username} />
    </Layout>,
  );
}
