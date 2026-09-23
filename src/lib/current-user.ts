import { cookies } from "next/headers";
import { getAuthStore, SESSION_COOKIE } from "./auth-store";

export async function currentUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? getAuthStore().getUser(token) : null;
}
