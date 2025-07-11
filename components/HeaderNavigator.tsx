import { AuthUser } from "@/types/auth.ts";

export interface HeaderNavigatorProps {
  user?: AuthUser;
}

export default function HeaderNavigator({ user }: HeaderNavigatorProps) {
  return (
    <nav class="container">
      <ul>
        <li>
          <a href="/">
            <strong>Microblog</strong>
          </a>
        </li>
      </ul>
      <ul>
        {user ? <AuthedNavigator user={user} /> : <UnauthedNavigator />}
      </ul>
    </nav>
  );
}

function AuthedNavigator({ user }: { user: AuthUser }) {
  return (
    (
      <>
        <li>
          <a href={`/users/${user.username}`}>
            {user.actor?.name || user.username}
          </a>
        </li>
        <li>
          <a href="/auth/logout">Logout</a>
        </li>
      </>
    )
  );
}

function UnauthedNavigator() {
  return (
    <li>
      <a href="/auth/login">Login</a>
    </li>
  );
}
