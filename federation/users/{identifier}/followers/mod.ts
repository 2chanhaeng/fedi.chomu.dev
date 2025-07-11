import { CollectionDispatcher, Context, Recipient } from "@fedify/fedify";
import prisma from "prisma";

const followersDispatcher: CollectionDispatcher<
  Recipient,
  Context<unknown>,
  unknown,
  URL
> = async (_ctx, identifier, _cursor) => {
  const followers = await prisma.user.findUnique({
    where: { username: identifier },
  }).actor().followers({
    include: { follower: true },
    orderBy: { created: "desc" },
  }) ?? [];

  const items: Recipient[] = followers.map(({ follower: f }) => ({
    id: new URL(f.uri),
    inboxId: new URL(f.inboxUrl),
    endpoints: f.sharedInboxUrl == null
      ? null
      : { sharedInbox: new URL(f.sharedInboxUrl) },
  }));
  return { items };
};

export default followersDispatcher;
