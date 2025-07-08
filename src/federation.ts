import {
  Accept,
  type Actor as APActor,
  Create,
  createFederation,
  Endpoints,
  exportJwk,
  Follow,
  generateCryptoKeyPair,
  getActorHandle,
  importJwk,
  InProcessMessageQueue,
  isActor,
  MemoryKvStore,
  Note,
  Person,
  PUBLIC_COLLECTION,
  type Recipient,
  Undo,
} from "@fedify/fedify";
import { getLogger } from "@logtape/logtape";
import prisma, { Prisma } from "prisma";

const logger = getLogger("fedify-example");

const federation = createFederation({
  kv: new MemoryKvStore(),
  queue: new InProcessMessageQueue(),
});

federation.setActorDispatcher(
  "/users/{identifier}",
  async (ctx, identifier) => {
    const user = await prisma.user.findUnique({
      where: { username: identifier },
      include: { actor: true },
    });
    if (user?.actor == null) return null;

    const keys = await ctx.getActorKeyPairs(identifier);
    return new Person({
      id: ctx.getActorUri(identifier),
      preferredUsername: identifier,
      name: user.actor.name,
      inbox: ctx.getInboxUri(identifier),
      endpoints: new Endpoints({
        sharedInbox: ctx.getInboxUri(),
      }),
      url: ctx.getActorUri(identifier),
      publicKey: keys[0].cryptographicKey,
      assertionMethods: keys.map((k) => k.multikey),
      followers: ctx.getFollowersUri(identifier),
    });
  },
).setKeyPairsDispatcher(async (ctx, identifier) => {
  const user = await prisma.user.findUnique({
    where: { username: identifier },
    include: { keys: true },
  });
  if (user == null) return [];

  const keys = Object.fromEntries(
    user.keys.map((row) => [row.type, row]),
  ) as Record<string, typeof user.keys[0]>;
  const pairs: CryptoKeyPair[] = [];
  // 사용자가 지원하는 두 키 형식 (RSASSA-PKCS1-v1_5 및 Ed25519) 각각에 대해
  // 키 쌍을 보유하고 있는지 확인하고, 없으면 생성 후 데이터베이스에 저장:
  for (const keyType of ["RSASSA-PKCS1-v1_5", "Ed25519"] as const) {
    if (keys[keyType] == null) {
      logger.debug(
        "The user {identifier} does not have an {keyType} key; creating one...",
        { identifier, keyType },
      );
      const { privateKey, publicKey } = await generateCryptoKeyPair(keyType);
      await prisma.key.create({
        data: {
          userId: user.id,
          type: keyType,
          privateKey: JSON.stringify(await exportJwk(privateKey)),
          publicKey: JSON.stringify(await exportJwk(publicKey)),
        },
      });
      pairs.push({ privateKey, publicKey });
    } else {
      pairs.push({
        privateKey: await importJwk(
          JSON.parse(keys[keyType].privateKey),
          "private",
        ),
        publicKey: await importJwk(
          JSON.parse(keys[keyType].publicKey),
          "public",
        ),
      });
    }
  }
  return pairs;
});

federation.setInboxListeners("/users/{identifier}/inbox", "/inbox").on(
  Follow,
  async (ctx, follow) => {
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
    const followingActor = await prisma.actor.findFirst({
      where: {
        user: { username: object.identifier },
      },
    });
    if (followingActor == null) {
      logger.debug(
        "Failed to find the actor to follow in the database: {object}",
        { object },
      );
      return;
    }
    const followingId = followingActor.id;

    const followerActor = await prisma.actor.upsert({
      where: { uri: follower.id.href },
      update: {
        handle: await getActorHandle(follower),
        name: follower.name?.toString(),
        inboxUrl: follower.inboxId.href,
        sharedInboxUrl: follower.endpoints?.sharedInbox?.href,
        url: follower.url?.href?.toString(),
      },
      create: {
        uri: follower.id.href,
        handle: await getActorHandle(follower),
        name: follower.name?.toString(),
        inboxUrl: follower.inboxId.href,
        sharedInboxUrl: follower.endpoints?.sharedInbox?.href,
        url: follower.url?.href?.toString(),
      },
    });
    const followerId = followerActor.id;

    await prisma.follow.create({
      data: {
        followingId: followingId,
        followerId: followerId,
      },
    });

    const accept = new Accept({
      actor: follow.objectId,
      to: follow.actorId,
      object: follow,
    });
    await ctx.sendActivity(object, follower, accept);
  },
).on(Undo, async (ctx, undo) => {
  const object = await undo.getObject();
  if (!(object instanceof Follow)) return;
  if (undo.actorId == null || object.objectId == null) return;
  const parsed = ctx.parseUri(object.objectId);
  if (parsed == null || parsed.type !== "actor") return;

  await prisma.follow.deleteMany({
    where: {
      following: {
        user: { username: parsed.identifier },
      },
      follower: {
        uri: undo.actorId.href,
      },
    },
  });
}).on(Accept, async (ctx, accept) => {
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

  const followerActor = await prisma.actor.findFirst({
    where: {
      user: { username: parsed.identifier },
    },
  });
  if (followerActor == null) return;

  await prisma.follow.create({
    data: {
      followingId: followingActor.id,
      followerId: followerActor.id,
    },
  });
}).on(Create, async (ctx, create) => {
  const object = await create.getObject();
  if (!(object instanceof Note)) return;
  const actor = create.actorId;
  if (actor == null) return;
  const author = await object.getAttribution();
  if (!isActor(author) || author.id?.href !== actor.href) return;
  const actorRecord = await persistActor(author);
  if (actorRecord == null) return;
  if (object.id == null) return;
  const content = object.content?.toString();

  await prisma.post.create({
    data: {
      uri: object.id.href,
      actorId: actorRecord.id,
      content: content || "",
      url: object.url?.href?.toString(),
    },
  });
});

federation
  .setFollowersDispatcher(
    "/users/{identifier}/followers",
    async (ctx, identifier, cursor) => {
      const followers = await prisma.actor.findMany({
        where: {
          followers: {
            some: {
              following: {
                user: { username: identifier },
              },
            },
          },
        },
        orderBy: { created: "desc" },
      });

      const items: Recipient[] = followers.map((f) => ({
        id: new URL(f.uri),
        inboxId: new URL(f.inboxUrl),
        endpoints: f.sharedInboxUrl == null
          ? null
          : { sharedInbox: new URL(f.sharedInboxUrl) },
      }));
      return { items };
    },
  )
  .setCounter(async (ctx, identifier) => {
    const count = await prisma.follow.count({
      where: {
        following: {
          user: { username: identifier },
        },
      },
    });
    return count;
  });

federation.setObjectDispatcher(
  Note,
  "/users/{identifier}/posts/{id}",
  async (ctx, values) => {
    const post = await prisma.post.findFirst({
      where: {
        id: values.id,
        actor: {
          user: { username: values.identifier },
        },
      },
    });

    if (post == null) return null;
    return new Note({
      id: ctx.getObjectUri(Note, values),
      attribution: ctx.getActorUri(values.identifier),
      to: PUBLIC_COLLECTION,
      cc: ctx.getFollowersUri(values.identifier),
      content: post.content,
      mediaType: "text/html",
      published: Temporal.Instant.from(post.created.toISOString()),
      url: ctx.getObjectUri(Note, values),
    });
  },
);

export default federation;

async function persistActor(
  actor: APActor,
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
