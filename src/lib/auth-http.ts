import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuthError, SESSION_COOKIE, SESSION_SECONDS } from "./auth-store";

export function assertSameOrigin(request: NextRequest) {
  // Next can construct request.url with its internal listening address. The Host
  // header reflects the address used by the browser (and cannot be set by JS).
  const expected = new URL(request.url);
  expected.host = request.headers.get("host") ?? expected.host;
  if (request.headers.get("origin") !== expected.origin) {
    throw new AuthError("Запрос отклонён. Обновите страницу и попробуйте снова.", 403);
  }
}

export async function readAuthBody(request: NextRequest): Promise<unknown> {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    throw new AuthError("Ожидается JSON-запрос.", 415);
  }
  // Bound the stream as well as Content-Length (which a client can omit).
  const reader = request.body?.getReader();
  if (!reader) throw new AuthError("Заполните форму.", 400);
  let length = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > 8192) {
        await reader.cancel();
        throw new AuthError("Слишком большой запрос.", 413);
      }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch (error) {
    if (error instanceof AuthError) throw error;
    throw new AuthError("Не удалось прочитать форму.", 400);
  } finally {
    reader.releaseLock();
  }
}

export function authResponse(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export function setSessionCookie(response: NextResponse, token: string, request: NextRequest) {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: request.nextUrl.protocol === "https:",
    sameSite: "lax",
    path: "/",
    maxAge: token ? SESSION_SECONDS : 0,
  });
}

export function authFailure(error: unknown) {
  if (error instanceof AuthError) return authResponse({ error: error.message }, error.status);
  if (error instanceof ZodError) return authResponse({ error: error.issues[0]?.message ?? "Проверьте поля формы." }, 400);
  // Never log submitted credentials or return database details to clients.
  return authResponse({ error: "Не удалось выполнить запрос. Попробуйте позже." }, 500);
}
