import FollowingList from "@/components/FollowingList.tsx";
import Layout from "@/components/Layout.tsx";
import { map, toArray } from "@/lib/utils.ts";
import { Context } from "@hono/hono";
import { BlankEnv, BlankInput } from "@hono/hono/types";
import prisma from "prisma";
import { get, guarantee, pipe } from "utils";

export default async function UserFollowingPage(
  c: Context<BlankEnv, "/users/:username/following", BlankInput>,
): Promise<Response> {
  const username = c.req.param("username");
  const following = await prisma.user
    .findUniqueOrThrow({ where: { username } })
    .actor().following({ include: { following: true } })
    .then(pipe(guarantee, map(get("following")), toArray));
  if (!Array.isArray(following)) return c.notFound();

  return c.html(
    <Layout>
      <FollowingList following={following} />
    </Layout>,
  );
}
