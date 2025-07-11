import { ContentfulStatusCode } from "@hono/hono/utils/http-status";

export class ErrorWithState extends Error {
  constructor(message: string, public state: ContentfulStatusCode) {
    super(message);
    this.name = "ErrorWithState";
  }
  throw(): never {
    throw this;
  }
}
