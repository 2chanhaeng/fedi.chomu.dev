import { Actor, User } from "prisma";
import PostList, { PostListProps } from "./PostList.tsx";

export interface HomeProps extends PostListProps {
  user?: User & { actor: Actor };
}

export default function Home(
  { user, posts }: HomeProps,
) {
  return (
    <>
      <hgroup>
        <h1>Feed</h1>
      </hgroup>
      <SearchForm user={user} />
      <PostForm user={user} />
      <PostList posts={posts} />
    </>
  );
}

function SearchForm({ user }: { user?: User }) {
  if (!user) return null;
  return (
    <form method="post" action={`/users/${user.username}/following`}>
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
  );
}

function PostForm({ user }: { user?: User }) {
  if (!user) return null;
  const username = user.username;
  return (
    <form method="post" action={`/users/${username}/posts`}>
      <fieldset>
        <label>
          <textarea name="content" required placeholder="What's up?" />
        </label>
      </fieldset>
      <input type="submit" value="Post" />
    </form>
  );
}
