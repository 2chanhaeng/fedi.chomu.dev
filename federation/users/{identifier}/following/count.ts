import { CollectionCounter } from "@fedify/fedify";
import prisma from "prisma";

const followingCounter: CollectionCounter<unknown, void> = async (
  _ctx,
  identifier,
) =>
  await prisma.user
    .findUniqueOrThrow({ where: { username: identifier } })
    .actor({ select: { _count: { select: { following: true } } } })
    .then((user) => user?._count.following ?? 0)
    .catch(() => 0);

export default followingCounter;
