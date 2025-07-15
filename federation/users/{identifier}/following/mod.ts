import { map, toArray } from "@/lib/utils.ts";
import { CollectionDispatcher, Context } from "@fedify/fedify";
import prisma from "prisma";
import { get, guarantee, pipe, to } from "utils";

const followingDispatcher: CollectionDispatcher<
  URL,
  Context<unknown>,
  unknown,
  void
> = async (_ctx, identifier, _cursor) => {
  const items = await prisma.user
    .findUnique({ where: { username: identifier } })
    .actor().following({
      include: { following: true },
      orderBy: { created: "desc" },
    }).then(
      pipe(
        guarantee,
        map(pipe(
          get("following"),
          get("uri"),
          to(URL),
        )),
        toArray,
      ),
    ) ?? [];
  return { items };
};

export default followingDispatcher;
