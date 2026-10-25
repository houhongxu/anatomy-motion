import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { get } from "node:http";
import { gunzipSync } from "node:zlib";
import express from "express";
import { createApp } from "../src/app.js";

const readResponse = (url, encoding) =>
  new Promise((resolve, reject) => {
    get(url, { headers: { "Accept-Encoding": encoding } }, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () =>
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: Buffer.concat(chunks),
        }),
      );
      res.on("error", reject);
    }).on("error", reject);
  });

test("static model assets negotiate gzip above 1 KiB and keep small assets uncompressed", async () => {
  const directory = mkdtempSync(join(tmpdir(), "anatomy-compression-"));
  const model = JSON.stringify({
    vertices: Array.from({ length: 4000 }, (_, i) => i % 20),
  });
  const small = JSON.stringify({ status: "small" });
  writeFileSync(join(directory, "model.json"), model);
  writeFileSync(join(directory, "small.json"), small);
  const instance = createApp({
    dbPath: ":memory:",
    structures: [{ id: "biceps-left", kind: "muscle", side: "left" }],
  });
  instance.app.use("/models", express.static(directory));
  const server = instance.app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const base = "http://127.0.0.1:" + server.address().port;
  try {
    const compressed = await readResponse(base + "/models/model.json", "gzip");
    assert.equal(compressed.status, 200);
    assert.equal(compressed.headers["content-encoding"], "gzip");
    assert.match(compressed.headers.vary, /Accept-Encoding/i);
    assert.equal(gunzipSync(compressed.body).toString(), model);
    assert.ok(compressed.body.length < Buffer.byteLength(model) / 2);

    const identity = await readResponse(
      base + "/models/model.json",
      "identity",
    );
    assert.equal(identity.headers["content-encoding"], undefined);
    assert.equal(identity.body.toString(), model);

    const smallResponse = await readResponse(
      base + "/models/small.json",
      "gzip",
    );
    assert.equal(smallResponse.headers["content-encoding"], undefined);
    assert.equal(smallResponse.body.toString(), small);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    instance.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
