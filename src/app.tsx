import { federation } from "@fedify/fedify/x/hono";
import { Hono } from "@hono/hono";
import { getLogger } from "@logtape/logtape";
import fedi from "./federation.ts";
import { Layout, SetupForm } from "./views.tsx";

const logger = getLogger("fedify-example");

const app = new Hono();

app.use(federation(fedi, () => undefined));
app.get("/setup", (c) =>
  c.html(
    <Layout>
      <SetupForm />
    </Layout>,
  ));
app.get("/", (c) => c.text("Hello, Fedify!"));

export default app;
