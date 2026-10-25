import express from "express";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { createApp } from "./app.js";
const { app, close } = createApp();
const webRoot = process.env.WEB_ROOT
  ? resolve(process.env.WEB_ROOT)
  : fileURLToPath(new URL("../../creator/build/web-desktop", import.meta.url));
const modelRoot = fileURLToPath(new URL("../../models", import.meta.url));
app.use(
  "/models",
  express.static(modelRoot, { index: false, dotfiles: "deny" }),
);
if (existsSync(webRoot)) app.use(express.static(webRoot, { dotfiles: "deny" }));
const port = Number(process.env.PORT || 3000),
  host = process.env.HOST || "127.0.0.1";
const server = app.listen(port, host, () =>
  console.log("Anatomy Motion listening on http://" + host + ":" + port),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () =>
    server.close(() => {
      close();
      process.exit(0);
    }),
  );
