import { Prisma } from "prisma";

export const newerAhead = { orderBy: { created: "desc" } } as const;
export const includeActor = { include: { actor: true } } as const;
const fols = { followers: true, following: true } as const;

const selectFols = { select: fols } as const;
export const includeFolCount = { include: { _count: selectFols } } as const;
export const actorFolCount = { include: { actor: includeFolCount } } as const;

const actorIncludeFolCountPosts = {
  _count: selectFols,
  posts: newerAhead,
} satisfies Prisma.ActorInclude;

export const userInclude = {
  actor: {
    folCount: {
      actor: includeFolCount,
    } satisfies Prisma.UserInclude,
    folCountPosts: {
      actor: { include: actorIncludeFolCountPosts },
    } satisfies Prisma.UserInclude,
    following: {
      actor: {
        include: { following: { include: { following: true } } },
      },
    },
    followers: {
      actor: {
        include: { followers: { include: { follower: true } } },
      },
    },
  },
} as const;
