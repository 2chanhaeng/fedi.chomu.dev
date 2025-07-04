import {
  Accept,
  createFederation,
  Endpoints,
  exportJwk,
  Follow,
  generateCryptoKeyPair,
  getActorHandle,
  importJwk,
  InProcessMessageQueue,
  MemoryKvStore,
  Person,
} from "@fedify/fedify";
import { getLogger } from "@logtape/logtape";
import db from "./db.ts";
import type { Actor, Key, User } from "./schema.ts";

const logger = getLogger("fedify-example");

const federation = createFederation({
  kv: new MemoryKvStore(),
  queue: new InProcessMessageQueue(),
});

federation.setActorDispatcher(
  "/users/{identifier}",
  async (ctx, identifier) => {
    const user = db
      .prepare(
        `
      SELECT * FROM users
      JOIN actors ON (users.id = actors.user_id)
      WHERE users.username = ?
      `,
      )
      .get<User & Actor>(identifier);
    if (user == null) return null;

    const keys = await ctx.getActorKeyPairs(identifier);
    return new Person({
      id: ctx.getActorUri(identifier),
      preferredUsername: identifier,
      name: user.name,
      inbox: ctx.getInboxUri(identifier),
      endpoints: new Endpoints({
        sharedInbox: ctx.getInboxUri(),
      }),
      url: ctx.getActorUri(identifier),
      publicKey: keys[0].cryptographicKey,
      assertionMethods: keys.map((k) => k.multikey),
    });
  },
).setKeyPairsDispatcher(async (ctx, identifier) => {
  const user = db
    .prepare("SELECT * FROM users WHERE username = ?")
    .get<User>(identifier);
  if (user == null) return [];
  const rows = db
    .prepare("SELECT * FROM keys WHERE keys.user_id = ?")
    .all<Key>(user.id);
  const keys = Object.fromEntries(
    rows.map((row) => [row.type, row]),
  ) as Record<Key["type"], Key>;
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
      db.prepare(
        `
          INSERT INTO keys (user_id, type, private_key, public_key)
          VALUES (?, ?, ?, ?)
          `,
      ).run(
        user.id,
        keyType,
        JSON.stringify(await exportJwk(privateKey)),
        JSON.stringify(await exportJwk(publicKey)),
      );
      pairs.push({ privateKey, publicKey });
    } else {
      pairs.push({
        privateKey: await importJwk(
          JSON.parse(keys[keyType].private_key),
          "private",
        ),
        publicKey: await importJwk(
          JSON.parse(keys[keyType].public_key),
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
    const followingId = db
      .prepare(
        `
        SELECT * FROM actors
        JOIN users ON users.id = actors.user_id
        WHERE users.username = ?
        `,
      )
      .get<Actor>(object.identifier)?.id;
    if (followingId == null) {
      logger.debug(
        "Failed to find the actor to follow in the database: {object}",
        { object },
      );
    }
    db
      .prepare(
        `
        INSERT INTO actors (uri, handle, name, inbox_url, shared_inbox_url, url)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT (uri) DO UPDATE SET
          handle = excluded.handle, name = excluded.name, inbox_url = excluded.inbox_url, shared_inbox_url = excluded.shared_inbox_url, url = excluded.url
        WHERE actors.uri = excluded.uri RETURNING *
        `,
      ).run(
        follower.id.href,
        await getActorHandle(follower),
        follower.name?.toString(),
        follower.inboxId.href,
        follower.endpoints?.sharedInbox?.href ?? "",
        follower.url?.href?.toString() ?? "",
      );
    const followerId = db.prepare(
      "SELECT id FROM actors WHERE uri = ?",
    ).get<Actor>(follower.id.href)
      ?.id;
    db.prepare(
      "INSERT INTO follows (following_id, follower_id) VALUES (?, ?)",
    ).run(followingId, followerId);
    const accept = new Accept({
      actor: follow.objectId,
      to: follow.actorId,
      object: follow,
    });
    await ctx.sendActivity(object, follower, accept);
  },
);

export default federation;
