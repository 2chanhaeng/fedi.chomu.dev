import { Create, InboxListener, isActor, Note } from "@fedify/fedify";
import prisma from "prisma";
import { persistActor } from "../utils.ts";

const inboxCreateHandler: InboxListener<unknown, Create> = async (
  _ctx,
  create,
) => {
  const object = await create.getObject();
  if (!(object instanceof Note)) return;
  const actor = create.actorId;
  if (actor == null) return;
  const author = await object.getAttribution();
  if (!isActor(author) || author.id?.href !== actor.href) return;
  const actorRecord = await persistActor(author);
  if (actorRecord == null) return;
  if (object.id == null) return;
  const content = object.content?.toString();

  await prisma.post.create({
    data: {
      uri: object.id.href,
      actorId: actorRecord.id,
      content: content || "",
      url: object.url?.href?.toString(),
    },
  });
};

export default inboxCreateHandler;
