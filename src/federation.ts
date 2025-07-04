import {
  createFederation,
  InProcessMessageQueue,
  MemoryKvStore,
  Person,
} from "@fedify/fedify";
import { getLogger } from "@logtape/logtape";

const logger = getLogger("fedify-example");

const federation = createFederation({
  kv: new MemoryKvStore(),
  queue: new InProcessMessageQueue(),
});

federation.setActorDispatcher(
  "/users/{identifier}",
  async (ctx, identifier) => {
    return new Person({
      id: ctx.getActorUri(identifier),
      preferredUsername: identifier,
      name: identifier,
    });
  },
);
federation.setInboxListeners("/users/{identifier}/inbox", "/inbox");

export default federation;
