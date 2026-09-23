import { NextRequest } from "next/server";
import { getAuthStore, SESSION_COOKIE } from "@/lib/auth-store";
import { assertSameOrigin, authFailure, authResponse, readAuthBody, setSessionCookie } from "@/lib/auth-http";

export const runtime = "nodejs";

export async function POST(request: NextRequest, context: { params: Promise<{ action: string }> }) {
  try {
    assertSameOrigin(request);
    const { action } = await context.params;
    if (!["register", "login", "logout"].includes(action)) return authResponse({ error: "Страница не найдена." }, 404);
    const store = getAuthStore();
    const oldToken = request.cookies.get(SESSION_COOKIE)?.value;
    if (action === "logout") {
      store.logout(oldToken);
      const response = authResponse({ ok: true });
      setSessionCookie(response, "", request);
      return response;
    }
    const body = await readAuthBody(request);
    const { user, token } = action === "register" ? await store.register(body) : await store.login(body);
    store.logout(oldToken);
    const response = authResponse({ user }, action === "register" ? 201 : 200);
    setSessionCookie(response, token, request);
    return response;
  } catch (error) {
    return authFailure(error);
  }
}
