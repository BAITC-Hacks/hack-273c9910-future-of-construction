import { createHash, randomBytes, randomUUID, scrypt, timingSafeEqual } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { credentialsSchema, profileSchema, registerSchema, type PublicUser } from "./auth-schema";

export const SESSION_COOKIE = "akim-session";
export const SESSION_SECONDS = 60 * 60 * 24 * 30;
const USER_COLUMNS = "id, login, display_name AS displayName, bio, created_at AS createdAt";

export class AuthError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

function passwordHash(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 }, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// This module is only imported by server pages and route handlers.
export class AuthStore {
  private db: DatabaseSync;

  constructor(filename: string) {
    if (filename !== ":memory:") mkdirSync(path.dirname(filename), { recursive: true });
    this.db = new DatabaseSync(filename);
    this.db.exec(`
      PRAGMA busy_timeout = 5000;
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        login TEXT NOT NULL UNIQUE,
        display_name TEXT NOT NULL,
        bio TEXT NOT NULL DEFAULT '',
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS sessions (
        token_hash TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
      CREATE TABLE IF NOT EXISTS auth_attempts (
        key TEXT PRIMARY KEY,
        count INTEGER NOT NULL,
        expires_at INTEGER NOT NULL
      );
    `);
  }

  private consumeAttempt(login: string) {
    const now = Date.now();
    this.db.prepare("DELETE FROM auth_attempts WHERE expires_at <= ?").run(now);
    // Atomic across Node workers; checked before the expensive password derivation.
    const result = this.db.prepare(`INSERT INTO auth_attempts (key, count, expires_at) VALUES (?, 1, ?)
      ON CONFLICT(key) DO UPDATE SET count = count + 1 RETURNING count`).get(login, now + 15 * 60 * 1000) as { count: number };
    if (result.count > 10) throw new AuthError("Слишком много попыток. Попробуйте через 15 минут.", 429);
  }

  async register(input: unknown) {
    const { login, password, displayName } = registerSchema.parse(input);
    this.consumeAttempt(login);
    const salt = randomBytes(16).toString("hex");
    const hash = (await passwordHash(password, salt)).toString("hex");
    const user: PublicUser = { id: randomUUID(), login, displayName, bio: "", createdAt: new Date().toISOString() };
    const inserted = this.db.prepare(`INSERT INTO users (id, login, display_name, password_hash, salt, created_at)
      VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(login) DO NOTHING`).run(user.id, login, displayName, hash, salt, user.createdAt);
    if (!inserted.changes) throw new AuthError("Этот логин уже занят. Выберите другой.", 409);
    return { user, token: this.createSession(user.id) };
  }

  async login(input: unknown) {
    const { login, password } = credentialsSchema.parse(input);
    this.consumeAttempt(login);
    const row = this.db.prepare(`SELECT ${USER_COLUMNS}, password_hash, salt FROM users WHERE login = ?`).get(login) as
      (PublicUser & { password_hash: string; salt: string }) | undefined;
    // Unknown users take the same password derivation path.
    const actual = await passwordHash(password, row?.salt ?? "00000000000000000000000000000000");
    const expected = row ? Buffer.from(row.password_hash, "hex") : Buffer.alloc(64);
    const matches = timingSafeEqual(actual, expected);
    if (!row || !matches) throw new AuthError("Неверный логин или пароль.", 401);
    this.db.prepare("DELETE FROM auth_attempts WHERE key = ?").run(login);
    const { id, displayName, bio, createdAt } = row;
    return { user: { id, login, displayName, bio, createdAt }, token: this.createSession(id) };
  }

  private createSession(userId: string): string {
    const token = randomBytes(32).toString("hex");
    this.db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(Date.now());
    this.db.prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)")
      .run(tokenHash(token), userId, Date.now() + SESSION_SECONDS * 1000);
    return token;
  }

  getUser(token: string | undefined): PublicUser | null {
    if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
    const row = this.db.prepare(`SELECT ${USER_COLUMNS} FROM users WHERE id = (
      SELECT user_id FROM sessions WHERE token_hash = ? AND expires_at > ?
    )`).get(tokenHash(token), Date.now()) as PublicUser | undefined;
    // SQLite rows have a null prototype; React server/client props need a plain object.
    return row ? { ...row } : null;
  }

  updateProfile(token: string | undefined, input: unknown): PublicUser {
    const user = this.getUser(token);
    if (!user) throw new AuthError("Войдите в аккаунт, чтобы изменить профиль.", 401);
    const { displayName, bio } = profileSchema.parse(input);
    this.db.prepare("UPDATE users SET display_name = ?, bio = ? WHERE id = ?").run(displayName, bio, user.id);
    return { ...user, displayName, bio };
  }

  logout(token: string | undefined) {
    if (token) this.db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(tokenHash(token));
  }

  close() { this.db.close(); }
}

const globalAuth = globalThis as typeof globalThis & { akimAuthStore?: AuthStore };

export function getAuthStore(): AuthStore {
  return globalAuth.akimAuthStore ??= new AuthStore(
    process.env.AUTH_DATABASE_PATH ?? path.join(process.cwd(), "data", "auth.sqlite"),
  );
}
