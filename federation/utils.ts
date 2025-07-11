import { type Actor, getActorHandle } from "@fedify/fedify";
import { getLogger } from "@logtape/logtape";
import prisma, { Prisma } from "prisma";

export const logger = getLogger("fedify-example");

export async function persistActor(
  actor: Actor,
): Promise<Prisma.ActorGetPayload<Record<PropertyKey, never>> | null> {
  if (actor.id == null || actor.inboxId == null) {
    logger.debug("Actor is missing required fields: {actor}", { actor });
    return null;
  }

  try {
    const uri = actor.id.href;
    const update = {
      handle: await getActorHandle(actor),
      name: actor.name?.toString(),
      inboxUrl: actor.inboxId.href,
      sharedInboxUrl: actor.endpoints?.sharedInbox?.href,
      url: actor.url?.href?.toString(),
    };
    const result = await prisma.actor.upsert({
      where: { uri },
      update,
      create: { uri, ...update },
    });
    return result;
  } catch (error) {
    logger.error("Failed to persist actor: {error}", { error });
    return null;
  }
}

export const findActor = (username: string) =>
  prisma.user.findUnique({ where: { username } }).actor();
