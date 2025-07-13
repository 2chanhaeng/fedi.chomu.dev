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

type ActorPath =
  | `${string}{identifier}${string}`
  | `${string}{handle}${string}`;

const fedi = createFederation({
  kv: new MemoryKvStore(),
  queue: new InProcessMessageQueue(),
});

const actorPaths = [
  "/users/{identifier}",
  "/@{identifier}",
] as ActorPath[];
const compositePaths = {
  inbox: ((path: ActorPath) => path + "/inbox" as ActorPath),
  followers: ((path: ActorPath) => path + "/followers" as ActorPath),
  posts:
    ((path: ActorPath) => path + "/posts/{id}" as `${ActorPath}/posts/{id}`),
};

actorPaths.forEach((path) =>
  fedi
    .setActorDispatcher(path, getUser)
    .setKeyPairsDispatcher(getKeys)
);
actorPaths.map(compositePaths.inbox)
  .forEach((path) =>
    fedi
      .setInboxListeners(path, "/inbox")
      .on(Follow, inboxFollowHandler)
      .on(Undo, inboxUndoHandler)
      .on(Accept, inboxAcceptHandler)
      .on(Create, inboxCreateHandler)
  );
actorPaths.map(compositePaths.followers)
  .forEach((path) =>
    fedi
      .setFollowersDispatcher(
        path,
        followersDispatcher,
      )
      .setCounter(followerCounter)
  );
actorPaths.map(compositePaths.posts)
  .forEach((path) =>
    fedi
      .setObjectDispatcher(
        Note,
        path,
        noteDispatcher,
      )
  );

export default fedi;
