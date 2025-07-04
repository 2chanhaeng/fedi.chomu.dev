import {
  Accept,
  type Actor as APActor,
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
import db from "./db.ts";
import type { Actor, Key, Post, User } from "./schema.ts";

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
      followers: ctx.getFollowersUri(identifier),
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
    const followerId = (await persistActor(follower))?.id;
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
).on(Undo, async (ctx, undo) => {
  const object = await undo.getObject();
  if (!(object instanceof Follow)) return;
  if (undo.actorId == null || object.objectId == null) return;
  const parsed = ctx.parseUri(object.objectId);
  if (parsed == null || parsed.type !== "actor") return;
  db.prepare(
    `
      DELETE FROM follows
      WHERE following_id = (
        SELECT actors.id
        FROM actors
        JOIN users ON actors.user_id = users.id
        WHERE users.username = ?
      ) AND follower_id = (SELECT id FROM actors WHERE uri = ?)
      `,
  ).run(parsed.identifier, undo.actorId.href);
}).on(Accept, async (ctx, accept) => {
  const follow = await accept.getObject();
  if (!(follow instanceof Follow)) return;
  const following = await accept.getActor();
  if (!isActor(following)) return;
  const follower = follow.actorId;
  if (follower == null) return;
  const parsed = ctx.parseUri(follower);
  if (parsed == null || parsed.type !== "actor") return;
  const followingId = (await persistActor(following))?.id;
  if (followingId == null) return;
  db.prepare(
    `
      INSERT INTO follows (following_id, follower_id)
      VALUES (
        ?,
        (
          SELECT actors.id
          FROM actors
          JOIN users ON actors.user_id = users.id
          WHERE users.username = ?
        )
      )
      `,
  ).run(followingId, parsed.identifier);
});
federation
  .setFollowersDispatcher(
    "/users/{identifier}/followers",
    (ctx, identifier, cursor) => {
      const followers = db
        .prepare(
          `
          SELECT followers.*
          FROM follows
          JOIN actors AS followers ON follows.follower_id = followers.id
          JOIN actors AS following ON follows.following_id = following.id
          JOIN users ON users.id = following.user_id
          WHERE users.username = ?
          ORDER BY follows.created DESC
          `,
        )
        .all<Actor>(identifier);
      const items: Recipient[] = followers.map((f) => ({
        id: new URL(f.uri),
        inboxId: new URL(f.inbox_url),
        endpoints: f.shared_inbox_url == null
          ? null
          : { sharedInbox: new URL(f.shared_inbox_url) },
      }));
      return { items };
    },
  )
  .setCounter((ctx, identifier) => {
    const result = db
      .prepare(
        `
        SELECT count(*) AS cnt
        FROM follows
        JOIN actors ON actors.id = follows.following_id
        JOIN users ON users.id = actors.user_id
        WHERE users.username = ?
        `,
      )
      .get<{ cnt: number }>(identifier);
    return result == null ? 0 : result.cnt;
  });
federation.setObjectDispatcher(
  Note,
  "/users/{identifier}/posts/{id}",
  (ctx, values) => {
    const post = db
      .prepare(
        `
        SELECT posts.*
        FROM posts
        JOIN actors ON actors.id = posts.actor_id
        JOIN users ON users.id = actors.user_id
        WHERE users.username = ? AND posts.id = ?
        `,
      )
      .get<Post>(values.identifier, values.id);
    console.log("post", post);
    if (post == null) return null;
    return new Note({
      id: ctx.getObjectUri(Note, values),
      attribution: ctx.getActorUri(values.identifier),
      to: PUBLIC_COLLECTION,
      cc: ctx.getFollowersUri(values.identifier),
      content: post.content,
      mediaType: "text/html",
      published: Temporal.Instant.from(`${post.created.replace(" ", "T")}Z`),
      url: ctx.getObjectUri(Note, values),
    });
  },
);

export default federation;

async function persistActor(actor: APActor): Promise<Actor | null> {
  if (actor.id == null || actor.inboxId == null) {
    logger.debug("Actor is missing required fields: {actor}", { actor });
    return null;
  }
  db.prepare(
    `
    INSERT INTO actors (uri, handle, name, inbox_url, shared_inbox_url, url)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT (uri) DO UPDATE SET
      handle = excluded.handle, name = excluded.name, inbox_url = excluded.inbox_url, shared_inbox_url = excluded.shared_inbox_url, url = excluded.url
    WHERE actors.uri = excluded.uri RETURNING *
    `,
  )
    .get<Actor>(
      actor.id.href,
      await getActorHandle(actor),
      actor.name?.toString(),
      actor.inboxId.href,
      actor.endpoints?.sharedInbox?.href,
      actor.url?.href?.toString(),
    );
  return db.prepare(
    "SELECT id FROM actors WHERE uri = ?",
  ).get<Actor>(actor.id.href) ?? null;
}
