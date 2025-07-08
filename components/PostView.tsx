import { Post } from "prisma";
import ActorLink, { ActorLinkProps } from "./ActorLink.tsx";

export interface PostViewProps {
  post: Post & ActorLinkProps;
}

export default function PostView({
  post: { content, url, uri, created, actor },
}: PostViewProps) {
  return (
    <article>
      <header>
        <ActorLink actor={actor} />
      </header>
      <div dangerouslySetInnerHTML={{ __html: content }} />
      <footer>
        <a href={url ?? uri}>
          <time datetime={new Date(created).toISOString()}>
            {created}
          </time>
        </a>
      </footer>
    </article>
  );
}
