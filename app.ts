import fedi from "@/federation/mod.ts";
import router from "@/routes/mod.ts";
import { federation } from "@fedify/fedify/x/hono";
import { Hono } from "@hono/hono";
import { trimTrailingSlash } from "@hono/hono/trailing-slash";
import { getLogger } from "@logtape/logtape";

const logger = getLogger("fedify-example");

const app = new Hono({ strict: true });

app.use(trimTrailingSlash());
app.route("/", router);
app.use(federation(fedi, () => undefined));

export default app;
