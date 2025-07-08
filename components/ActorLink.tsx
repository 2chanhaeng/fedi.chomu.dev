import { Actor } from "prisma";

export interface ActorLinkProps {
  actor: Actor;
}

export default function ActorLink({
  actor: { name, handle, url, uri },
}: ActorLinkProps) {
  const href = url ?? uri;
  return name == null
    ? (
      <a href={href} class="secondary">
        {handle}
      </a>
    )
    : (
      <>
        <a href={href}>{name}</a>{" "}
        <small>
          (
          <a href={href} class="secondary">
            {handle}
          </a>
          )
        </small>
      </>
    );
}
