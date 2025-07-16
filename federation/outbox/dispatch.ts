import {
  Activity,
  CollectionDispatcher,
  Create,
  Note,
  RequestContext,
} from "@fedify/fedify";
import prisma from "prisma";

const outboxDispatcher: CollectionDispatcher<
  Activity,
  RequestContext<unknown>,
  unknown,
  void
> = async (ctx, identifier, _cursor) => {
  // 발신함에서 활동들을 조회하여 반환
  const actor = await prisma.user.findUnique({
    where: { username: identifier },
  }).actor();

  if (!actor) {
    return { items: [] };
  }

  const posts = await prisma.post.findMany({
    where: {
      actorId: actor.id,
    },
    orderBy: {
      created: "desc",
    },
    take: 20, // 페이지네이션 고려
  });

  const activities: Activity[] = posts.map((post) => {
    const noteId = new URL(`/users/${identifier}/posts/${post.id}`, ctx.origin);
    const actorId = new URL(`/users/${identifier}`, ctx.origin);

    const note = new Note({
      id: noteId,
      content: post.content,
      published: Temporal.Instant.fromEpochMilliseconds(post.created.getTime()),
    });

    return new Create({
      id: new URL(`/users/${identifier}/activities/${post.id}`, ctx.origin),
      actor: actorId,
      object: note,
      published: Temporal.Instant.fromEpochMilliseconds(post.created.getTime()),
    });
  });

  return {
    items: activities,
  };
};

export default outboxDispatcher;
