import {
  createFederation,
  Endpoints,
  InProcessMessageQueue,
  MemoryKvStore,
  Person,
} from "@fedify/fedify";
import { getLogger } from "@logtape/logtape";
import db from "./db.ts";
import type { Actor, User } from "./schema.ts";

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
    return new Person({
      id: ctx.getActorUri(identifier),
      preferredUsername: identifier,
      name: user.name,
      inbox: ctx.getInboxUri(identifier),
      endpoints: new Endpoints({
        sharedInbox: ctx.getInboxUri(),
      }),
      url: ctx.getActorUri(identifier),
    });
  },
);
federation.setInboxListeners("/users/{identifier}/inbox", "/inbox");

export default federation;
