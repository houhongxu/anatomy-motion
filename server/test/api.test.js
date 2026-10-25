import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "../src/app.js";

const origin = "http://localhost:5173";
const structures = [
  { id: "biceps-left", kind: "muscle", side: "left" },
  { id: "achilles-right", kind: "tendon", side: "right" },
  { id: "humerus-left", kind: "bone", side: "left" },
];
const password = "a secure test password";
const baseRecord = {
  date: "2026-10-25",
  structureId: "biceps-left",
  side: "left",
  intensity: 4,
  note: "Training",
};
async function harness(options = {}) {
  const instance = createApp({
    dbPath: ":memory:",
    structures,
    allowedOrigin: origin,
    ...options,
  });
  const server = instance.app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const base = "http://127.0.0.1:" + server.address().port;
  async function request(
    path,
    { method = "GET", body, cookie, requestOrigin = origin, raw } = {},
  ) {
    const headers = {};
    if (requestOrigin !== null) headers.origin = requestOrigin;
    if (cookie) headers.cookie = cookie;
    if (body !== undefined || raw !== undefined)
      headers["content-type"] = "application/json";
    const response = await fetch(base + path, {
      method,
      headers,
      body: raw ?? (body === undefined ? undefined : JSON.stringify(body)),
    });
    const text = await response.text();
    return {
      status: response.status,
      body: text ? JSON.parse(text) : null,
      cookie: response.headers.get("set-cookie")?.split(";")[0],
      headers: response.headers,
    };
  }
  async function register(username = "alice") {
    return request("/api/auth/register", {
      method: "POST",
      body: { username, password },
    });
  }
  async function close() {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    instance.close();
  }
  return { ...instance, request, register, close };
}

test("registration, password hashing, login rotation, logout and expiry", async () => {
  const h = await harness();
  try {
    const registered = await h.register("Alice");
    assert.equal(registered.status, 201);
    assert.equal(registered.body.user.username, "alice");
    assert.match(registered.headers.get("set-cookie"), /HttpOnly/);
    assert.match(registered.headers.get("set-cookie"), /SameSite=Lax/);
    const stored = h.db
      .prepare("SELECT password_hash FROM users")
      .get().password_hash;
    assert.notEqual(stored, password);
    assert.match(stored, /^[a-f0-9]{32}:[a-f0-9]{128}$/);
    assert.notEqual(
      h.db.prepare("SELECT token_hash FROM sessions").get().token_hash,
      registered.cookie.split("=")[1],
    );
    assert.equal(
      (await h.request("/api/auth/me", { cookie: registered.cookie })).status,
      200,
    );
    assert.equal((await h.register()).status, 409);
    assert.equal(
      (
        await h.request("/api/auth/login", {
          method: "POST",
          body: { username: "alice", password: "wrong password" },
        })
      ).status,
      401,
    );
    const login = await h.request("/api/auth/login", {
      method: "POST",
      cookie: registered.cookie,
      body: { username: "alice", password },
    });
    assert.equal(login.status, 200);
    assert.notEqual(login.cookie, registered.cookie);
    assert.equal(
      (await h.request("/api/auth/me", { cookie: registered.cookie })).status,
      401,
    );
    assert.equal(
      (
        await h.request("/api/auth/logout", {
          method: "POST",
          cookie: login.cookie,
        })
      ).status,
      204,
    );
    assert.equal(
      (await h.request("/api/auth/me", { cookie: login.cookie })).status,
      401,
    );
    const second = await h.request("/api/auth/login", {
      method: "POST",
      body: { username: "alice", password },
    });
    h.db.prepare("UPDATE sessions SET expires_at=0").run();
    assert.equal(
      (await h.request("/api/auth/me", { cookie: second.cookie })).status,
      401,
    );
  } finally {
    await h.close();
  }
});

test("records upsert, filters, update conflict, deletion and account isolation", async () => {
  const h = await harness();
  try {
    const a = (await h.register()).cookie,
      b = (await h.register("bob")).cookie;
    assert.equal((await h.request("/api/records")).status, 401);
    const first = await h.request("/api/records", {
      method: "POST",
      cookie: a,
      body: baseRecord,
    });
    assert.equal(first.status, 200);
    const id = first.body.record.id;
    const updated = await h.request("/api/records", {
      method: "POST",
      cookie: a,
      body: { ...baseRecord, intensity: 8 },
    });
    assert.equal(updated.body.record.id, id);
    assert.equal(updated.body.record.intensity, 8);
    assert.equal(
      (await h.request("/api/records", { cookie: a })).body.total,
      1,
    );
    assert.equal(
      (await h.request("/api/records", { cookie: b })).body.total,
      0,
    );
    assert.equal(
      (
        await h.request("/api/records/" + id, {
          method: "PATCH",
          cookie: b,
          body: { note: "overwrite" },
        })
      ).status,
      404,
    );
    assert.equal(
      (await h.request("/api/records/" + id, { method: "DELETE", cookie: b }))
        .status,
      404,
    );
    await h.request("/api/records", {
      method: "POST",
      cookie: a,
      body: {
        ...baseRecord,
        date: "2026-10-24",
        structureId: "achilles-right",
        side: "right",
      },
    });
    const history = await h.request(
      "/api/records?from=2026-10-24&to=2026-10-24&structureId=achilles-right&side=right",
      { cookie: a },
    );
    assert.equal(history.body.total, 1);
    assert.equal(history.body.records[0].date, "2026-10-24");
    const paged = await h.request("/api/records?limit=1&offset=1", {
      cookie: a,
    });
    assert.equal(paged.body.total, 2);
    assert.equal(paged.body.records.length, 1);
    assert.equal(
      (
        await h.request("/api/records/" + id, {
          method: "PATCH",
          cookie: a,
          body: {
            date: "2026-10-24",
            structureId: "achilles-right",
            side: "right",
          },
        })
      ).status,
      409,
    );
    assert.equal(
      (
        await h.request("/api/records/" + id, {
          method: "PATCH",
          cookie: a,
          body: { note: "Recovery" },
        })
      ).body.record.note,
      "Recovery",
    );
    assert.equal(
      (await h.request("/api/records/" + id, { method: "DELETE", cookie: a }))
        .status,
      204,
    );
    assert.equal(
      (await h.request("/api/records", { cookie: a })).body.total,
      1,
    );
  } finally {
    await h.close();
  }
});

test("actual calendar dates, manifest, matching side and input boundaries are enforced", async () => {
  const h = await harness();
  try {
    const cookie = (await h.register()).cookie;
    const invalid = [
      { date: "2026-02-29" },
      { date: "2026-13-01" },
      { date: "2026-2-01" },
      { date: "0000-01-01" },
      { structureId: "unknown" },
      { structureId: "humerus-left" },
      { side: "right" },
      { side: "invalid" },
      { intensity: 11 },
      { intensity: -1 },
      { intensity: 1.5 },
      { intensity: "4" },
      { note: "x".repeat(2001) },
      { note: 42 },
      { extra: true },
    ];
    for (const patch of invalid)
      assert.equal(
        (
          await h.request("/api/records", {
            method: "POST",
            cookie,
            body: { ...baseRecord, ...patch },
          })
        ).status,
        400,
        JSON.stringify(patch).slice(0, 80),
      );
    assert.equal(
      (
        await h.request("/api/records", {
          method: "POST",
          cookie,
          body: { ...baseRecord, date: "2024-02-29", intensity: 0, note: "" },
        })
      ).status,
      200,
    );
    for (const query of [
      "from=2026-02-30",
      "from=2026-10-25&to=2026-10-01",
      "limit=1001",
      "offset=-1",
      "side=wrong",
      "structureId=unknown",
      "limit[x]=2",
    ])
      assert.equal(
        (await h.request("/api/records?" + query, { cookie })).status,
        400,
        query,
      );
    assert.equal(
      (
        await h.request("/api/records", {
          method: "POST",
          cookie,
          raw: "{broken",
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await h.request("/api/records", {
          method: "POST",
          cookie,
          raw: JSON.stringify({ ...baseRecord, note: "x".repeat(17000) }),
        })
      ).status,
      413,
    );
    assert.equal(
      (
        await h.request("/api/auth/register", {
          method: "POST",
          body: { username: "ab", password },
        })
      ).status,
      400,
    );
  } finally {
    await h.close();
  }
});

test("Origin protection, authentication throttling and secure cookie configuration", async () => {
  const h = await harness({
    secureCookies: true,
    rateLimit: { windowMs: 60_000, max: 2 },
  });
  try {
    assert.equal(
      (
        await h.request("/api/auth/register", {
          method: "POST",
          body: { username: "alice", password },
          requestOrigin: "https://evil.test",
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await h.request("/api/auth/register", {
          method: "POST",
          body: { username: "alice", password },
          requestOrigin: null,
        })
      ).status,
      403,
    );
    const registered = await h.register();
    assert.match(registered.headers.get("set-cookie"), /Secure/);
    assert.equal(
      (
        await h.request("/api/auth/logout", {
          method: "POST",
          cookie: registered.cookie,
          requestOrigin: "https://evil.test",
        })
      ).status,
      403,
    );
    assert.equal(
      (await h.request("/api/auth/me", { cookie: registered.cookie })).status,
      200,
    );
    await h.request("/api/auth/login", {
      method: "POST",
      body: { username: "alice", password: "wrong password" },
    });
    const limited = await h.request("/api/auth/login", {
      method: "POST",
      body: { username: "alice", password },
    });
    assert.equal(limited.status, 429);
    assert.ok(Number(limited.headers.get("retry-after")) > 0);
  } finally {
    await h.close();
  }
});

test("SQLite records and authenticated sessions persist across server restarts", async () => {
  const directory = mkdtempSync(join(tmpdir(), "anatomy-motion-"));
  const dbPath = join(directory, "anatomy.sqlite");
  let h = await harness({ dbPath });
  try {
    const cookie = (await h.register()).cookie;
    const created = await h.request("/api/records", {
      method: "POST",
      cookie,
      body: baseRecord,
    });
    await h.close();
    h = await harness({ dbPath });
    assert.equal(
      (await h.request("/api/auth/me", { cookie })).body.user.username,
      "alice",
    );
    const loaded = await h.request("/api/records", { cookie });
    assert.equal(loaded.body.total, 1);
    assert.deepEqual(loaded.body.records[0], created.body.record);
  } finally {
    await h.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
