import Layout from "@/components/Layout.tsx";
import { Context } from "@hono/hono";
import { BlankEnv, BlankInput } from "@hono/hono/types";
import prisma from "prisma";

export default async function UsersPage(
  c: Context<BlankEnv, "/users", BlankInput>,
): Promise<Response> {
  const users = await prisma.user.findMany({
    include: { actor: { include: { _count: true } } },
  });

  return c.html(
    <Layout>
      <ul>
        {users.map((user) => (
          <li key={user.id}>
            <a href={`/users/${user.username}`}>{user.username}</a>
          </li>
        ))}
      </ul>
    </Layout>,
  );
}
