// Copy pipeline output (../data/processed/*.json) into public/data/ so the app can fetch it.
// Runs automatically before `npm run dev` and `npm run build`.
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "..", "data", "processed");
const dst = join(root, "public", "data");

if (!existsSync(join(src, "index.json"))) {
  console.error(`copy-data: ${src}/index.json not found. Run pipeline.py first.`);
  process.exit(1);
}
rmSync(dst, { recursive: true, force: true }); // never serve stale results
mkdirSync(dst, { recursive: true });
const files = readdirSync(src).filter((f) => f.endsWith(".json"));
for (const f of files) cpSync(join(src, f), join(dst, f));
console.log(`copy-data: ${files.length} JSON files -> public/data/`);
