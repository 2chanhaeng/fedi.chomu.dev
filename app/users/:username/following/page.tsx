import FollowingList from "@/components/FollowingList.tsx";
import Layout from "@/components/Layout.tsx";
import { userInclude } from "@/lib/queries.ts";
import { Context } from "@hono/hono";
import { BlankEnv, BlankInput } from "@hono/hono/types";
import prisma from "prisma";
import { get } from "utils";

export default async function UserFollowingPage(
  c: Context<BlankEnv, "/users/:username/following", BlankInput>,
): Promise<Response> {
  const username = c.req.param("username");
  const user = await prisma.user.findUnique({
    where: { username },
    include: userInclude.actor.following,
  });
  if (!user?.actor) return c.notFound();
  const following = user.actor.following.map(get("following"));

  return c.html(
    <Layout>
      <FollowingList following={following} />
    </Layout>,
  );
}
