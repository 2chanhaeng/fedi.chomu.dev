import { CollectionCounter } from "@fedify/fedify";
import prisma from "prisma";

const followerCounter: CollectionCounter<unknown, URL> = async (
  _ctx,
  identifier,
) => {
  return await prisma.user.findUniqueOrThrow({
    where: {
      username: identifier,
    },
    select: {
      actor: {
        select: {
          _count: {
            select: {
              followers: true,
            },
          },
        },
      },
    },
  }).then((user) => user?.actor?._count.followers ?? 0).catch(() => 0);
};

export default followerCounter;
