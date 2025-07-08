import { Accept, Follow, getActorHandle, InboxListener } from "@fedify/fedify";
import { getLogger } from "@logtape/logtape";
import prisma from "prisma";
import { findActor } from "../utils.ts";

const logger = getLogger("fedify-example");

const inboxFollowHandler: InboxListener<unknown, Follow> = async (
  ctx,
  follow,
) => {
  if (follow.objectId == null) {
    logger.debug("The Follow object does not have an object: {follow}", {
      follow,
    });
    return;
  }
  const object = ctx.parseUri(follow.objectId);
  if (object == null || object.type !== "actor") {
    logger.debug("The Follow object's object is not an actor: {follow}", {
      follow,
    });
    return;
  }
  const follower = await follow.getActor();
  if (follower?.id == null || follower.inboxId == null) {
    logger.debug("The Follow object does not have an actor: {follow}", {
      follow,
    });
    return;
  }
  const followingActor = await findActor(object.identifier);
  if (followingActor == null) {
    logger.debug(
      "Failed to find the actor to follow in the database: {object}",
      { object },
    );
    return;
  }
  const followingId = followingActor.id;

  const uri = follower.id.href;
  const update = {
    handle: await getActorHandle(follower),
    name: follower.name?.toString(),
    inboxUrl: follower.inboxId.href,
    sharedInboxUrl: follower.endpoints?.sharedInbox?.href,
    url: follower.url?.href?.toString(),
  };
  const followerActor = await prisma.actor.upsert({
    where: { uri },
    update,
    create: { uri, ...update },
  });
  const followerId = followerActor.id;

  await prisma.follow.create({ data: { followingId, followerId } });

  const accept = new Accept({
    actor: follow.objectId,
    to: follow.actorId,
    object: follow,
  });
  await ctx.sendActivity(object, follower, accept);
};

export default inboxFollowHandler;
