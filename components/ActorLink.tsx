import { Actor } from "prisma";

export interface ActorLinkProps {
  actor: Actor;
}

export default function ActorLink({
  actor: { name, handle, url, uri, avatar },
}: ActorLinkProps) {
  const href = url ?? uri;
  return (
    <a href={href} class="contrast">
      {avatar && (
        <img
          src={avatar}
          alt={name ?? handle}
          class="avatar"
          width="32"
          height="32"
          style={{
            borderRadius: "9999px",
            marginRight: "0.5rem",
          }}
        />
      )}
      <span
        style={{
          fontWeight: "bold",
          marginRight: "0.5rem",
        }}
      >
        {name ?? handle}
      </span>
      {name && (
        <small class="secondary">
          {handle}
        </small>
      )}
    </a>
  );
}
