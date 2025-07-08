import { Actor, User } from "prisma";
import PostList, { PostListProps } from "./PostList.tsx";

export interface HomeProps extends PostListProps {
  user: User & {
    actor: Actor;
  };
  posts: PostListProps["posts"];
}

export default function Home(
  { user: { username, actor: { name } }, posts }: HomeProps,
) {
  return (
    <>
      <hgroup>
        <h1>{name}'s microblog</h1>
        <p>
          <a href={`/users/${username}`}>{name}'s profile</a>
        </p>
      </hgroup>
      <form method="post" action={`/users/${username}/following`}>
        {/* biome-ignore lint/a11y/noRedundantRoles: PicoCSS가 role=group을 요구함 */}
        <fieldset role="group">
          <input
            type="text"
            name="actor"
            required
            placeholder="Enter an actor handle (e.g., @johndoe@mastodon.com) or URI (e.g., https://mastodon.com/@johndoe)"
          />
          <input type="submit" value="Follow" />
        </fieldset>
      </form>
      <form method="post" action={`/users/${username}/posts`}>
        <fieldset>
          <label>
            <textarea name="content" required placeholder="What's up?" />
          </label>
        </fieldset>
        <input type="submit" value="Post" />
      </form>
      <PostList posts={posts} />
    </>
  );
}
