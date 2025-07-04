import { federation } from "@fedify/fedify/x/hono";
import { Hono } from "@hono/hono";
import { getLogger } from "@logtape/logtape";
import db from "./db.ts";
import fedi from "./federation.ts";
import type { User } from "./schema.ts";
import { Layout, SetupForm } from "./views.tsx";

const logger = getLogger("fedify-example");

const app = new Hono();

app.use(federation(fedi, () => undefined));
app.post("/setup", async (c) => {
  // 계정이 이미 있는지 검사
  const user = db.prepare<unknown[], User>("SELECT * FROM users LIMIT 1").get();
  if (user != null) return c.redirect("/");

  const form = await c.req.formData();
  const username = form.get("username");
  if (typeof username !== "string" || !username.match(/^[a-z0-9_-]{1,50}$/)) {
    return c.redirect("/setup");
  }
  db.prepare("INSERT INTO users (username) VALUES (?)").run(username);
  return c.redirect("/");
});
app.get("/setup", (c) => {
  // 계정이 이미 있는지 검사
  const user = db.prepare<unknown[], User>("SELECT * FROM users LIMIT 1").get();
  if (user != null) return c.redirect("/");

  return c.html(
    <Layout>
      <SetupForm />
    </Layout>,
  );
});
app.get("/", (c) => c.text("Hello, Fedify!"));

export default app;
