import { Follow, InboxListener, Undo } from "@fedify/fedify";
import prisma from "prisma";

const inboxUndoHandler: InboxListener<unknown, Undo> = async (
  ctx,
  undo,
) => {
  try {
    const object = await undo.getObject();
    if (object instanceof Follow) {
      if (undo.actorId == null || object.objectId == null) {
        throw new Error("Missing actorId or objectId");
      }
      const parsed = ctx.parseUri(object.objectId);
      if (parsed == null || parsed.type !== "actor") {
        throw new Error("Invalid objectId format");
      }

      await prisma.follow.deleteMany({
        where: {
          following: { user: { username: parsed.identifier } },
          follower: { uri: undo.actorId.href },
        },
      });
    }
  } catch (error) {
    console.error("Error processing undo operation:", error);
    throw error; // Re-throw the error to be handled by the federation framework
  }
};

export default inboxUndoHandler;
