import fedi from "@/federation/mod.ts";
import { authMiddleware } from "@/lib/auth.ts";
import router from "@/routes/mod.ts";
import { federation } from "@fedify/fedify/x/hono";
import { Hono } from "@hono/hono";
import { trimTrailingSlash } from "@hono/hono/trailing-slash";
import { getLogger } from "@logtape/logtape";

const logger = getLogger("fedify-example");

const app = new Hono({ strict: true });

app.use(trimTrailingSlash());
app.use(federation(fedi, () => undefined));
app.use("*", authMiddleware); // 모든 라우트에 인증 미들웨어 적용
app.route("/", router);

export default app;
