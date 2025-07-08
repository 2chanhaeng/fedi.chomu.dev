import type { Actor } from "prisma";
import ActorLink from "./ActorLink.tsx";

export interface FollowerListProps {
  followers: Actor[];
}

export default function FollowerList({ followers }: FollowerListProps) {
  return (
    <>
      <h2>Followers</h2>
      <ul>
        {followers.map((follower) => (
          <li key={follower.id}>
            <ActorLink actor={follower} />
          </li>
        ))}
      </ul>
    </>
  );
}
