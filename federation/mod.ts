import {
  createFederation,
  InProcessMessageQueue,
  MemoryKvStore,
} from "@fedify/fedify";
import FederationConfigurator, { ActorPath } from "./config.ts";
import inbox from "./inbox/mod.ts";
import outbox from "./outbox/mod.ts";
import followers from "./users/{identifier}/followers/mod.ts";
import following from "./users/{identifier}/following/mod.ts";
import actor from "./users/{identifier}/mod.ts";
import posts from "./users/{identifier}/posts/{id}/mod.ts";

const addActorPath = (path: string) => (actorPath: ActorPath) =>
  `${actorPath}/${path}` as ActorPath;

const configurator = new FederationConfigurator(
  "/users/{identifier}",
  "/inbox",
  {
    inbox: addActorPath("inbox"),
    followers: addActorPath("followers"),
    following: addActorPath("following"),
    posts: addActorPath("posts/{id}"),
    outbox: addActorPath("outbox"),
  },
  { actor, inbox, followers, following, posts, outbox },
);

const fedi = configurator.configure(createFederation({
  kv: new MemoryKvStore(),
  queue: new InProcessMessageQueue(),
}));

export default fedi;
