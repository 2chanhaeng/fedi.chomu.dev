import FollowerList from "@/components/FollowerList.tsx";
import Layout from "@/components/Layout.tsx";
import { userInclude } from "@/lib/queries.ts";
import { Context } from "@hono/hono";
import { BlankEnv, BlankInput } from "@hono/hono/types";
import prisma from "prisma";
import { get } from "utils";

export default async function UserFollowersPage(
  c: Context<BlankEnv, "/users/:username/followers", BlankInput>,
): Promise<Response> {
  const username = c.req.param("username");
  const user = await prisma.user.findUnique({
    where: { username },
    include: userInclude.actor.followers,
  });
  if (!user?.actor) return c.notFound();
  const followers = user.actor.followers.map(get("follower"));

  return c.html(
    <Layout>
      <FollowerList followers={followers} />
    </Layout>,
  );
}
