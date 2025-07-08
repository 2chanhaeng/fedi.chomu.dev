import {
  Accept,
  Create,
  createFederation,
  Follow,
  InProcessMessageQueue,
  MemoryKvStore,
  Note,
  Undo,
} from "@fedify/fedify";
import inboxAcceptHandler from "./inbox/accept.ts";
import inboxCreateHandler from "./inbox/create.ts";
import inboxFollowHandler from "./inbox/follow.ts";
import inboxUndoHandler from "./inbox/undo.ts";
import getKeys from "./keys/mod.ts";
import followerCounter from "./users/{identifier}/followers/count.ts";
import followersDispatcher from "./users/{identifier}/followers/mod.ts";
import getUser from "./users/{identifier}/mod.ts";
import noteDispatcher from "./users/{identifier}/posts/{id}/mod.ts";

const fedi = createFederation({
  kv: new MemoryKvStore(),
  queue: new InProcessMessageQueue(),
});

fedi.setActorDispatcher("/users/{identifier}", getUser)
  .setKeyPairsDispatcher(getKeys);

fedi.setInboxListeners("/users/{identifier}/inbox", "/inbox") //
  .on(Follow, inboxFollowHandler) //
  .on(Undo, inboxUndoHandler) //
  .on(Accept, inboxAcceptHandler) //
  .on(Create, inboxCreateHandler);

fedi
  .setFollowersDispatcher(
    "/users/{identifier}/followers",
    followersDispatcher,
  )
  .setCounter(followerCounter);

fedi.setObjectDispatcher(
  Note,
  "/users/{identifier}/posts/{id}",
  noteDispatcher,
);

export default fedi;
