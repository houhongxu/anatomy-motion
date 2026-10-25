import express from "express";
import compression from "compression";
import Database from "better-sqlite3";
import {
  randomBytes,
  scrypt as callback,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { promisify } from "node:util";
import { readFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
const scrypt = promisify(callback),
  COOKIE = "anatomy_session",
  MAX_AGE = 30 * 86400_000;
const hash = (s) => createHash("sha256").update(s).digest("hex");
const now = () => new Date().toISOString();
const fail = (res, status, code, message) =>
  res.status(status).json({ error: { code, message } });
const asyncRoute = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res)).catch(next);
const plain = (x) => x !== null && typeof x === "object" && !Array.isArray(x);
const shape = (r) => ({
  id: r.id,
  date: r.date,
  structureId: r.structure_id,
  side: r.side,
  intensity: r.intensity,
  note: r.note,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});
export function isValidDate(s) {
  if (
    typeof s !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(s) ||
    s < "1900-01-01" ||
    s > "9999-12-31"
  )
    return false;
  const d = new Date(s + "T00:00:00.000Z");
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}
export function createApp({
  dbPath = process.env.DATABASE_PATH ||
    fileURLToPath(new URL("../data/anatomy.sqlite", import.meta.url)),
  manifestPath = fileURLToPath(
    new URL("../../shared/anatomy-manifest.json", import.meta.url),
  ),
  structures,
  allowedOrigin = process.env.APP_ORIGIN || "http://localhost:3000",
  secureCookies = process.env.COOKIE_SECURE === "true" ||
    process.env.NODE_ENV === "production",
  rateLimit = { windowMs: 15 * 60_000, max: 30 },
} = {}) {
  const origin = new URL(allowedOrigin).origin;
  const catalog =
    structures || JSON.parse(readFileSync(manifestPath, "utf8")).structures;
  if (!Array.isArray(catalog) || !catalog.length)
    throw new Error("Anatomy manifest must contain structures.");
  const recordable = new Map(
    catalog
      .filter((s) => ["muscle", "tendon"].includes(s.kind))
      .map((s) => [s.id, s]),
  );
  if (!recordable.size)
    throw new Error("Anatomy manifest has no recordable structures.");
  if (dbPath !== ":memory:") mkdirSync(dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.pragma("foreign_keys = ON");
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT,username TEXT NOT NULL UNIQUE,password_hash TEXT NOT NULL,created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,expires_at INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
    CREATE TABLE IF NOT EXISTS records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      date TEXT NOT NULL,structure_id TEXT NOT NULL,side TEXT NOT NULL CHECK(side IN ('left','right','midline')),
      intensity INTEGER NOT NULL CHECK(intensity BETWEEN 0 AND 10),note TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,updated_at TEXT NOT NULL,UNIQUE(user_id,date,structure_id,side));
    CREATE INDEX IF NOT EXISTS records_user_date ON records(user_id,date DESC);
    PRAGMA user_version = 1;
  `);
  const app = express();
  app.disable("x-powered-by");
  app.use(compression({ threshold: 1024 }));
  app.use((req, res, next) => {
    res.set({
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "same-origin",
    });
    next();
  });
  app.use("/api", (req, res, next) => {
    if (
      ["POST", "PUT", "PATCH", "DELETE"].includes(req.method) &&
      req.get("origin") !== origin
    )
      return fail(
        res,
        403,
        "ORIGIN_REJECTED",
        "Request origin is not allowed.",
      );
    next();
  });
  app.use(express.json({ limit: "16kb", strict: true }));
  const attempts = new Map();
  const limitAuth = (req, res, next) => {
    const time = Date.now();
    for (const [key, e] of attempts)
      if (e.resetAt <= time) attempts.delete(key);
    let e = attempts.get(req.ip);
    if (!e) {
      e = { count: 0, resetAt: time + rateLimit.windowMs };
      attempts.set(req.ip, e);
    }
    if (++e.count > rateLimit.max) {
      res.set(
        "Retry-After",
        String(Math.max(1, Math.ceil((e.resetAt - time) / 1000))),
      );
      return fail(
        res,
        429,
        "RATE_LIMITED",
        "Too many authentication attempts. Try again later.",
      );
    }
    next();
  };
  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookies,
    path: "/",
  };
  const token = (req) => {
    const c = (req.get("cookie") || "")
      .split(";")
      .map((x) => x.trim())
      .find((x) => x.startsWith(COOKIE + "="));
    const t = c?.slice(COOKIE.length + 1);
    return t && /^[a-f0-9]{64}$/.test(t) ? t : null;
  };
  const startSession = (req, res, id) => {
    const old = token(req);
    if (old)
      db.prepare("DELETE FROM sessions WHERE token_hash=?").run(hash(old));
    db.prepare("DELETE FROM sessions WHERE expires_at<=?").run(Date.now());
    const t = randomBytes(32).toString("hex");
    db.prepare("INSERT INTO sessions VALUES (?,?,?)").run(
      hash(t),
      id,
      Date.now() + MAX_AGE,
    );
    res.cookie(COOKIE, t, { ...cookieOptions, maxAge: MAX_AGE });
  };
  const auth = (req, res, next) => {
    const t = token(req);
    const user =
      t &&
      db
        .prepare(
          "SELECT users.id,users.username FROM sessions JOIN users ON users.id=sessions.user_id WHERE token_hash=? AND expires_at>?",
        )
        .get(hash(t), Date.now());
    if (!user) return fail(res, 401, "UNAUTHENTICATED", "Please sign in.");
    req.user = user;
    next();
  };
  const credentials = (b) => {
    if (
      !plain(b) ||
      Object.keys(b).some((k) => !["username", "password"].includes(k))
    )
      return null;
    const username =
      typeof b.username === "string" ? b.username.trim().toLowerCase() : "";
    if (
      !/^[a-z0-9_]{3,32}$/.test(username) ||
      typeof b.password !== "string" ||
      b.password.length < 10 ||
      b.password.length > 128
    )
      return null;
    return { username, password: b.password };
  };
  const passwordHash = async (p, salt = randomBytes(16).toString("hex")) =>
    salt + ":" + (await scrypt(p, salt, 64)).toString("hex");
  app.get("/api/health", (req, res) => {
    db.prepare("SELECT 1").get();
    res.json({ status: "ok" });
  });
  app.post(
    "/api/auth/register",
    limitAuth,
    asyncRoute(async (req, res) => {
      const b = credentials(req.body);
      if (!b)
        return fail(
          res,
          400,
          "INVALID_CREDENTIALS",
          "Username must be 3-32 letters, digits or underscores; password must be 10-128 characters.",
        );
      const h = await passwordHash(b.password);
      let result;
      try {
        result = db
          .prepare(
            "INSERT INTO users (username,password_hash,created_at) VALUES (?,?,?)",
          )
          .run(b.username, h, now());
      } catch (e) {
        if (e.code === "SQLITE_CONSTRAINT_UNIQUE")
          return fail(res, 409, "USERNAME_TAKEN", "Username is already taken.");
        throw e;
      }
      const user = { id: Number(result.lastInsertRowid), username: b.username };
      startSession(req, res, user.id);
      res.status(201).json({ user });
    }),
  );
  app.post(
    "/api/auth/login",
    limitAuth,
    asyncRoute(async (req, res) => {
      const b = credentials(req.body);
      if (!b)
        return fail(
          res,
          400,
          "INVALID_CREDENTIALS",
          "Enter a valid username and a password of 10-128 characters.",
        );
      const user = db
        .prepare("SELECT * FROM users WHERE username=?")
        .get(b.username);
      const [salt, stored] = (
        user?.password_hash ||
        "00000000000000000000000000000000:" + "00".repeat(64)
      ).split(":");
      const computed = (await passwordHash(b.password, salt)).split(":")[1];
      if (
        !user ||
        !timingSafeEqual(
          Buffer.from(stored, "hex"),
          Buffer.from(computed, "hex"),
        )
      )
        return fail(
          res,
          401,
          "LOGIN_FAILED",
          "Username or password is incorrect.",
        );
      startSession(req, res, user.id);
      res.json({ user: { id: user.id, username: user.username } });
    }),
  );
  app.post("/api/auth/logout", (req, res) => {
    const t = token(req);
    if (t) db.prepare("DELETE FROM sessions WHERE token_hash=?").run(hash(t));
    res.clearCookie(COOKIE, cookieOptions);
    res.status(204).end();
  });
  app.get("/api/auth/me", auth, (req, res) => res.json({ user: req.user }));
  const sides = new Set(["left", "right", "midline"]);
  const validate = (b, partial = false) => {
    if (
      !plain(b) ||
      !Object.keys(b).length ||
      Object.keys(b).some(
        (k) =>
          !["date", "structureId", "side", "intensity", "note"].includes(k),
      )
    )
      return null;
    if ((!partial || "date" in b) && !isValidDate(b.date)) return null;
    if (
      (!partial || "structureId" in b) &&
      (typeof b.structureId !== "string" || !recordable.has(b.structureId))
    )
      return null;
    if ((!partial || "side" in b) && !sides.has(b.side)) return null;
    if (
      (!partial || "intensity" in b) &&
      (!Number.isInteger(b.intensity) || b.intensity < 0 || b.intensity > 10)
    )
      return null;
    if ("note" in b && (typeof b.note !== "string" || b.note.length > 2000))
      return null;
    return { ...b, ...(!partial && !("note" in b) ? { note: "" } : {}) };
  };
  const sideValid = (b) => recordable.get(b.structureId)?.side === b.side;
  const owned = (id, user) =>
    db.prepare("SELECT * FROM records WHERE id=? AND user_id=?").get(id, user);
  const validId = (id) =>
    /^[1-9]\d*$/.test(id) && Number.isSafeInteger(Number(id));
  app.use("/api/records", auth);
  app.get("/api/records", (req, res) => {
    const {
      from,
      to,
      structureId,
      side,
      limit = "1000",
      offset = "0",
    } = req.query;
    if (
      Object.keys(req.query).some(
        (k) =>
          !["from", "to", "structureId", "side", "limit", "offset"].includes(k),
      ) ||
      (from !== undefined && !isValidDate(from)) ||
      (to !== undefined && !isValidDate(to)) ||
      (from && to && from > to) ||
      (structureId !== undefined && !recordable.has(structureId)) ||
      (side !== undefined && !sides.has(side)) ||
      typeof limit !== "string" ||
      !/^\d+$/.test(limit) ||
      Number(limit) < 1 ||
      Number(limit) > 1000 ||
      typeof offset !== "string" ||
      !/^\d+$/.test(offset) ||
      !Number.isSafeInteger(Number(offset))
    )
      return fail(res, 400, "INVALID_FILTER", "Invalid history filters.");
    const clauses = ["user_id=?"],
      values = [req.user.id];
    for (const [column, op, value] of [
      ["date", ">=", from],
      ["date", "<=", to],
      ["structure_id", "=", structureId],
      ["side", "=", side],
    ]) {
      if (value !== undefined) {
        clauses.push(column + op + "?");
        values.push(value);
      }
    }
    const where = clauses.join(" AND ");
    const total = db
      .prepare("SELECT COUNT(*) AS total FROM records WHERE " + where)
      .get(...values).total;
    const rows = db
      .prepare(
        "SELECT * FROM records WHERE " +
          where +
          " ORDER BY date DESC,updated_at DESC,id DESC LIMIT ? OFFSET ?",
      )
      .all(...values, Number(limit), Number(offset));
    res.json({ records: rows.map(shape), total });
  });
  app.post("/api/records", (req, res) => {
    const b = validate(req.body);
    if (!b || !sideValid(b))
      return fail(
        res,
        400,
        "INVALID_RECORD",
        "Provide a valid date, muscle or tendon, matching side, intensity 0-10 and note up to 2000 characters.",
      );
    const time = now();
    db.prepare(
      `INSERT INTO records (user_id,date,structure_id,side,intensity,note,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)
      ON CONFLICT(user_id,date,structure_id,side) DO UPDATE SET intensity=excluded.intensity,note=excluded.note,updated_at=excluded.updated_at`,
    ).run(
      req.user.id,
      b.date,
      b.structureId,
      b.side,
      b.intensity,
      b.note,
      time,
      time,
    );
    const row = db
      .prepare(
        "SELECT * FROM records WHERE user_id=? AND date=? AND structure_id=? AND side=?",
      )
      .get(req.user.id, b.date, b.structureId, b.side);
    res.json({ record: shape(row) });
  });
  app.patch("/api/records/:id", (req, res) => {
    if (!validId(req.params.id))
      return fail(res, 404, "NOT_FOUND", "Record not found.");
    const row = owned(Number(req.params.id), req.user.id);
    if (!row) return fail(res, 404, "NOT_FOUND", "Record not found.");
    const b = validate(req.body, true);
    if (!b) return fail(res, 400, "INVALID_RECORD", "Invalid record fields.");
    const merged = { ...shape(row), ...b };
    if (!sideValid(merged))
      return fail(res, 400, "INVALID_RECORD", "Structure and side must match.");
    try {
      db.prepare(
        "UPDATE records SET date=?,structure_id=?,side=?,intensity=?,note=?,updated_at=? WHERE id=? AND user_id=?",
      ).run(
        merged.date,
        merged.structureId,
        merged.side,
        merged.intensity,
        merged.note,
        now(),
        row.id,
        req.user.id,
      );
    } catch (e) {
      if (e.code === "SQLITE_CONSTRAINT_UNIQUE")
        return fail(
          res,
          409,
          "RECORD_EXISTS",
          "A record already exists for that date, structure and side.",
        );
      throw e;
    }
    res.json({ record: shape(owned(row.id, req.user.id)) });
  });
  app.delete("/api/records/:id", (req, res) => {
    if (!validId(req.params.id))
      return fail(res, 404, "NOT_FOUND", "Record not found.");
    if (
      !db
        .prepare("DELETE FROM records WHERE id=? AND user_id=?")
        .run(Number(req.params.id), req.user.id).changes
    )
      return fail(res, 404, "NOT_FOUND", "Record not found.");
    res.status(204).end();
  });
  app.use("/api", (req, res) =>
    fail(res, 404, "NOT_FOUND", "API route not found."),
  );
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error.type === "entity.too.large")
      return fail(res, 413, "BODY_TOO_LARGE", "Request body is too large.");
    if (error instanceof SyntaxError && "body" in error)
      return fail(res, 400, "INVALID_JSON", "Request body must be valid JSON.");
    console.error("API request failed:", error.message);
    fail(res, 500, "INTERNAL_ERROR", "An unexpected error occurred.");
  });
  return { app, db, close: () => db.close() };
}
