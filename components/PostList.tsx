import PostView, { PostViewProps } from "./PostView.tsx";

export interface PostListProps {
  posts: PostViewProps["post"][];
}

export default function PostList({ posts }: PostListProps) {
  return (
    <>
      {posts.map((post) => (
        <div key={post.id}>
          <PostView post={post} />
        </div>
      ))}
    </>
  );
}
