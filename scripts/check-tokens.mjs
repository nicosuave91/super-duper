import fs from "fs";
import path from "path";

const ROOT = process.cwd();

const IGNORE_DIRS = new Set([
  "node_modules",
  "dist",
  "build",
  ".turbo",
  ".git",
  ".next",
  ".output",
  "coverage",
]);

const ALLOW_PATH_SUBSTRINGS = [
  path.join("packages", "config", "tokens"),
];

const EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".vue", ".css", ".scss", ".sass"]);

const HEX_RE = /#[0-9a-fA-F]{3,8}\b/g;
const GRAY_RE = /\b(text|bg|border|ring|stroke|fill)-gray-\d+\b/g;

function isAllowedPath(filePath) {
  return ALLOW_PATH_SUBSTRINGS.some((p) => filePath.includes(p));
}

function walk(dir, out = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.isDirectory()) {
      if (IGNORE_DIRS.has(e.name)) continue;
      walk(path.join(dir, e.name), out);
    } else {
      const ext = path.extname(e.name);
      if (!EXTENSIONS.has(ext)) continue;
      out.push(path.join(dir, e.name));
    }
  }
  return out;
}

function findMatchesInFile(file) {
  const rel = path.relative(ROOT, file);
  if (isAllowedPath(rel)) return [];

  const text = fs.readFileSync(file, "utf8");
  const lines = text.split(/\r?\n/);

  const findings = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // ignore obvious false positives (e.g., comments describing hex codes)
    // still counts if in actual class/style/const usage
    const hex = [...line.matchAll(HEX_RE)].map((m) => m[0]);
    const gray = [...line.matchAll(GRAY_RE)].map((m) => m[0]);

    if (hex.length || gray.length) {
      findings.push({
        rel,
        lineNo: i + 1,
        line: line.trim(),
        hex,
        gray,
      });
    }
  }

  return findings;
}

function main() {
  const files = walk(path.join(ROOT, "apps")).concat(walk(path.join(ROOT, "packages")));

  const findings = [];
  for (const f of files) {
    findings.push(...findMatchesInFile(f));
  }

  const offenders = findings.filter((f) => (f.hex?.length ?? 0) > 0 || (f.gray?.length ?? 0) > 0);

  if (offenders.length === 0) {
    console.log("✅ Token enforcement passed (no hardcoded hex or gray utilities found).");
    process.exit(0);
  }

  console.error("❌ Token enforcement failed.");
  console.error("Hardcoded hex colors and/or gray utilities were found outside allowlisted token files.\n");

  for (const o of offenders.slice(0, 200)) {
    console.error(`${o.rel}:${o.lineNo}`);
    if (o.hex?.length) console.error(`  hex: ${o.hex.join(", ")}`);
    if (o.gray?.length) console.error(`  gray: ${o.gray.join(", ")}`);
    console.error(`  ${o.line}\n`);
  }

  console.error(`Total offending lines: ${offenders.length}`);
  process.exit(1);
}

main();
