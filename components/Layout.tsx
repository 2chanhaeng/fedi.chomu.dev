import { AuthUser } from "@/types/auth.ts";
import type { Child } from "@hono/hono/jsx";
import HeaderNavigator from "./HeaderNavigator.tsx";

interface LayoutProps {
  children: Child;
  user?: AuthUser;
}

export default function Layout({ children, user }: LayoutProps) {
  return (
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content="light dark" />
        <title>Microblog</title>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css"
        />
      </head>
      <body>
        <HeaderNavigator user={user} />
        <main class="container">{children}</main>
      </body>
    </html>
  );
}
