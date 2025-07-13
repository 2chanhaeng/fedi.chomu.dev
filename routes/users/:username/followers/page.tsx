import FollowerList from "@/components/FollowerList.tsx";
import Layout from "@/components/Layout.tsx";
import { map, toArray } from "@/lib/utils.ts";
import { Context } from "@hono/hono";
import { BlankEnv, BlankInput } from "@hono/hono/types";
import prisma from "prisma";
import { get, guarantee, pipe } from "utils";

export default async function UserFollowersPage(
  c: Context<BlankEnv, "/users/:username/followers", BlankInput>,
): Promise<Response> {
  const username = c.req.param("username");
  const followers = await prisma.user
    .findUniqueOrThrow({ where: { username } })
    .actor().followers({ include: { follower: true } })
    .then(pipe(guarantee, map(get("follower")), toArray));
  if (!Array.isArray(followers)) return c.notFound();

  return c.html(
    <Layout>
      <FollowerList followers={followers} />
    </Layout>,
  );
}
