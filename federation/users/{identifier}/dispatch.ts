import { ActorDispatcher, Endpoints, Person } from "@fedify/fedify";
import prisma from "prisma";

const actorDispatcher: ActorDispatcher<unknown> = async (ctx, identifier) => {
  if (!identifier) return null;

  const actor = await prisma.user.findUnique({
    where: { username: identifier },
  }).actor();
  if (actor == null) return null;

  const keys = await ctx.getActorKeyPairs(identifier);
  return new Person({
    id: ctx.getActorUri(identifier),
    preferredUsername: identifier,
    name: actor.name,
    inbox: ctx.getInboxUri(identifier),
    endpoints: new Endpoints({
      sharedInbox: ctx.getInboxUri(),
    }),
    url: ctx.getActorUri(identifier),
    publicKey: keys[0].cryptographicKey,
    assertionMethods: keys.map((k) => k.multikey),
    followers: ctx.getFollowersUri(identifier),
  });
};

export default actorDispatcher;
