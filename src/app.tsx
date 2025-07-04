import { Hono } from "@hono/hono";
import { federation } from "@fedify/fedify/x/hono";
import { getLogger } from "@logtape/logtape";
import fedi from "./federation.ts";

const logger = getLogger("fedify-example");

const app = new Hono();
app.use(federation(fedi, () => undefined))

app.get("/", (c) => c.text("Hello, Fedify!"));

export default app;
