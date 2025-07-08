import ActorLink, { ActorLinkProps } from "./ActorLink.tsx";

export interface FollowingListProps {
  following: ActorLinkProps["actor"][];
}
export default function FollowingList({ following }: FollowingListProps) {
  return (
    <>
      <h2>Following</h2>
      <ul>
        {following.map((actor) => (
          <li key={actor.id}>
            <ActorLink actor={actor} />
          </li>
        ))}
      </ul>
    </>
  );
}
