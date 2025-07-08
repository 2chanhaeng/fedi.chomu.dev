import { Prisma } from "prisma";
import { includeFolCount } from "../lib/queries.ts";

export interface ProfileProps {
  username: string;
  actor: Prisma.ActorGetPayload<typeof includeFolCount>;
}

export default function Profile(
  { username, actor: { name, handle, _count: { following, followers } } }:
    ProfileProps,
) {
  return (
    <>
      <hgroup>
        <h1>{name}</h1>
        <p>
          <span style="user-select: all;">{handle}</span> &middot;{" "}
          <a href={`/users/${username}/following`}>{following} following</a>
          {" "}
          &middot;{" "}
          <a href={`/users/${username}/followers`}>
            {followers === 1 ? "1 follower" : `${followers} followers`}
          </a>
        </p>
      </hgroup>
    </>
  );
}
