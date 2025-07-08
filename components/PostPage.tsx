import { Prisma } from "prisma";
import { actorFolCount } from "../lib/queries.ts";
import PostView from "./PostView.tsx";
import Profile from "./Profile.tsx";

export interface PostPageProps {
  post: Prisma.PostGetPayload<typeof actorFolCount>;
  username: string;
}

export default function PostPage({ post, username }: PostPageProps) {
  return (
    <>
      <Profile
        username={username}
        actor={post.actor}
      />
      <PostView post={post} />
    </>
  );
}
