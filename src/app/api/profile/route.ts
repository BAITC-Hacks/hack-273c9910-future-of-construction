import { NextRequest } from "next/server";
import { getAuthStore, SESSION_COOKIE } from "@/lib/auth-store";
import { assertSameOrigin, authFailure, authResponse, readAuthBody } from "@/lib/auth-http";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    return authResponse({ user: getAuthStore().getUser(request.cookies.get(SESSION_COOKIE)?.value) });
  } catch (error) { return authFailure(error); }
}

export async function PATCH(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const user = getAuthStore().updateProfile(request.cookies.get(SESSION_COOKIE)?.value, await readAuthBody(request));
    return authResponse({ user });
  } catch (error) { return authFailure(error); }
}
