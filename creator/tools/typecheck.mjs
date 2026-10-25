// 使用官方引擎声明验证。 / Validate with the official engine declarations.
import { existsSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const declaration = [
  process.env.COCOS_CC_DECLARATION,
  process.env.COCOS_ENGINE_ROOT &&
    join(process.env.COCOS_ENGINE_ROOT, "bin/.declarations/cc.d.ts"),
  join(root, "temp/declarations/cc.d.ts"),
].find((p) => p && existsSync(p));
if (!declaration) {
  console.error(
    "缺少官方 Cocos 类型声明。设置 COCOS_CC_DECLARATION，或先在编辑器打开项目。 / Missing official Cocos declarations. Set COCOS_CC_DECLARATION or open the project in the editor first.",
  );
  process.exit(1);
}
const temp = mkdtempSync(join(tmpdir(), "anatomy-creator-check-"));
const config = join(temp, "tsconfig.json");
try {
  writeFileSync(
    config,
    JSON.stringify({
      compilerOptions: {
        target: "ES2020",
        module: "ESNext",
        moduleResolution: "node",
        experimentalDecorators: true,
        strict: true,
        skipLibCheck: true,
        noEmit: true,
        lib: ["ES2020", "DOM", "DOM.Iterable"],
        baseUrl: root,
        paths: { cc: [resolve(declaration)] },
      },
      include: [join(root, "assets/scripts/*.ts")],
    }),
  );
  const result = spawnSync(
    process.execPath,
    [join(root, "node_modules/typescript/bin/tsc"), "-p", config],
    { stdio: "inherit" },
  );
  process.exitCode = result.status ?? 1;
} finally {
  rmSync(temp, { recursive: true, force: true });
}
