import { Accept, Follow, InboxListener, isActor } from "@fedify/fedify";
import prisma from "prisma";
import { findActor, persistActor } from "../utils.ts";

const inboxAcceptHandler: InboxListener<unknown, Accept> = async (
  ctx,
  accept,
) => {
  const follow = await accept.getObject();
  if (!(follow instanceof Follow)) return;
  const following = await accept.getActor();
  if (!isActor(following)) return;
  const follower = follow.actorId;
  if (follower == null) return;
  const parsed = ctx.parseUri(follower);
  if (parsed == null || parsed.type !== "actor") return;
  const followingActor = await persistActor(following);
  if (followingActor == null) return;

  const followerActor = await findActor(parsed.identifier);
  if (followerActor == null) return;

  await prisma.follow.create({
    data: {
      followingId: followingActor.id,
      followerId: followerActor.id,
    },
  });
};

export default inboxAcceptHandler;
