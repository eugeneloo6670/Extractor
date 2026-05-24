import { packager } from "@electron/packager";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

await packager({
  dir: rootDir,
  name: "DocScalpel",
  platform: "win32",
  arch: "x64",
  out: path.join(rootDir, "release"),
  overwrite: true,
  asar: true,
  prune: true,
  ignore: [
    /^\/\.env(?:\..*)?$/,
    /^\/\.git(?:\/|$)/,
    /^\/release(?:\/|$)/,
    /^\/test-artifacts(?:\/|$)/,
  ],
});
