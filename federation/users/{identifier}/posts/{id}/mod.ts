import { Note, ObjectDispatcher, PUBLIC_COLLECTION } from "@fedify/fedify";
import prisma from "prisma";

const noteDispatcher: ObjectDispatcher<unknown, Note, "id" | "identifier"> =
  async (ctx, values) => {
    const post = await prisma.post.findFirst({
      where: {
        id: values.id,
        actor: {
          user: { username: values.identifier },
        },
      },
    });

    if (post == null) return null;
    return new Note({
      id: ctx.getObjectUri(Note, values),
      attribution: ctx.getActorUri(values.identifier),
      to: PUBLIC_COLLECTION,
      cc: ctx.getFollowersUri(values.identifier),
      content: post.content,
      mediaType: "text/html",
      published: Temporal.Instant.from(post.created.toISOString()),
      url: ctx.getObjectUri(Note, values),
    });
  };

export default noteDispatcher;
