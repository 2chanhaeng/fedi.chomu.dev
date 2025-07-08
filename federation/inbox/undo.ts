import { InboxListener, Undo } from "@fedify/fedify";
import prisma from "prisma";

const inboxUndoHandler: InboxListener<unknown, Undo> = async (
  ctx,
  undo,
) => {
  const object = await undo.getObject();
  if (!(object instanceof Undo)) return;
  if (undo.actorId == null || object.objectId == null) return;
  const parsed = ctx.parseUri(object.objectId);
  if (parsed == null || parsed.type !== "actor") return;

  await prisma.follow.deleteMany({
    where: {
      following: { user: { username: parsed.identifier } },
      follower: { uri: undo.actorId.href },
    },
  });
};

export default inboxUndoHandler;
