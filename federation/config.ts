import type {
  Activity,
  Actor,
  ActorDispatcher,
  ActorKeyPairsDispatcher,
  CollectionCounter,
  CollectionDispatcher,
  Context,
  Federation,
  ObjectDispatcher,
  Recipient,
  RequestContext,
} from "@fedify/fedify";
import {
  Accept,
  Create,
  Follow,
  InboxListener,
  Note,
  Undo,
} from "@fedify/fedify";
export type ActorPath =
  | `${string}{identifier}${string}`
  | `${string}{handle}${string}`;

export default class FederationConfigurator<TContextData> {
  constructor(
    private actorPath: ActorPath,
    private sharedInboxPath: `/${string}`,
    private compositePaths: Record<
      "inbox" | "followers" | "following" | "posts" | "outbox",
      (path: ActorPath) => ActorPath
    >,
    private dispatchers: {
      actor: {
        dispatcher: ActorDispatcher<TContextData>;
        keysDispatcher: ActorKeyPairsDispatcher<TContextData>;
      };
      inbox: {
        follow: InboxListener<TContextData, Follow>;
        undo: InboxListener<TContextData, Undo>;
        accept: InboxListener<TContextData, Accept>;
        create: InboxListener<TContextData, Create>;
      };
      followers: {
        dispatcher: CollectionDispatcher<
          Recipient,
          Context<TContextData>,
          TContextData,
          URL
        >;
        counter: CollectionCounter<TContextData, URL>;
      };

      following: {
        dispatcher: CollectionDispatcher<
          Actor | URL,
          Context<TContextData>,
          TContextData,
          void
        >;
        counter: CollectionCounter<TContextData, void>;
      };
      posts: {
        note: ObjectDispatcher<TContextData, Note, "id" | "identifier">;
      };
      outbox: {
        dispatcher: CollectionDispatcher<
          Activity,
          RequestContext<TContextData>,
          unknown,
          void
        >;
      };
    },
  ) {}
  configure(
    federation: Federation<TContextData>,
  ) {
    this.configureActor(federation);
    this.configureInbox(federation);
    this.configureFollowers(federation);
    this.configureFollowing(federation);
    this.configurePosts(federation);
    this.configureOutbox(federation);
    return federation;
  }
  configureActor(federation: Federation<TContextData>) {
    federation
      .setActorDispatcher(this.paths.actor, this.dispatchers.actor.dispatcher)
      .setKeyPairsDispatcher(this.dispatchers.actor.keysDispatcher);
  }
  configureInbox(federation: Federation<TContextData>) {
    federation
      .setInboxListeners(this.paths.inbox, this.sharedInboxPath)
      .on(Follow, this.dispatchers.inbox.follow)
      .on(Undo, this.dispatchers.inbox.undo)
      .on(Accept, this.dispatchers.inbox.accept)
      .on(Create, this.dispatchers.inbox.create);
  }
  configureFollowers(federation: Federation<TContextData>) {
    federation
      .setFollowersDispatcher(
        this.paths.followers,
        this.dispatchers.followers.dispatcher,
      )
      .setCounter(this.dispatchers.followers.counter);
  }
  configureFollowing(federation: Federation<TContextData>) {
    federation
      .setFollowingDispatcher(
        this.paths.following,
        this.dispatchers.following.dispatcher,
      )
      .setCounter(this.dispatchers.following.counter);
  }
  configurePosts(federation: Federation<TContextData>) {
    federation
      .setObjectDispatcher(Note, this.paths.posts, this.dispatchers.posts.note);
  }
  configureOutbox(federation: Federation<TContextData>) {
    federation
      .setOutboxDispatcher(
        this.paths.outbox,
        this.dispatchers.outbox.dispatcher,
      );
  }
  get paths() {
    return {
      actor: this.actorPath,
      inbox: this.compositePaths.inbox(this.actorPath),
      followers: this.compositePaths.followers(this.actorPath),
      following: this.compositePaths.following(this.actorPath),
      posts: this.compositePaths.posts(this.actorPath),
      outbox: this.compositePaths.outbox(this.actorPath),
    };
  }
}
