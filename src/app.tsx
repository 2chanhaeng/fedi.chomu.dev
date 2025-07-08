import router from "@/app/mod.ts";
import fedi from "@/federation/mod.ts";
import { federation } from "@fedify/fedify/x/hono";
import { Hono } from "@hono/hono";
import { getLogger } from "@logtape/logtape";

const logger = getLogger("fedify-example");

const app = new Hono();

app.use(federation(fedi, () => undefined));
app.route("/", router);

export default app;
