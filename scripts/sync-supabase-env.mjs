#!/usr/bin/env node
/**
 * After `npx supabase start`, write Supabase + DB keys into .env.local
 * (preserves existing Gemini/Pinecone keys).
 */
import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const envPath = path.join(root, ".env.local");

function stripQuotes(v) {
  const s = v.trim();
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    return s.slice(1, -1);
  }
  return s;
}

function parseEnv(text) {
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i < 0) continue;
    out[line.slice(0, i).trim()] = stripQuotes(line.slice(i + 1));
  }
  return out;
}

function formatEnv(map, order) {
  const lines = [];
  const used = new Set();
  for (const key of order) {
    if (key in map) {
      lines.push(`${key}=${map[key] ?? ""}`);
      used.add(key);
    }
  }
  for (const key of Object.keys(map).sort()) {
    if (!used.has(key)) lines.push(`${key}=${map[key] ?? ""}`);
  }
  return lines.join("\n") + "\n";
}

let statusEnv = "";
try {
  statusEnv = execSync("npx supabase status -o env", {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
} catch (e) {
  console.error(
    "Could not read Supabase status. Is Docker running and did you run: npx supabase start ?",
  );
  console.error(e.stderr?.toString?.() || e.message);
  process.exit(1);
}

const fromStatus = parseEnv(statusEnv);
const existing = existsSync(envPath)
  ? parseEnv(readFileSync(envPath, "utf8"))
  : {};

const apiUrl =
  fromStatus.API_URL ||
  fromStatus.SUPABASE_URL ||
  "http://127.0.0.1:54321";
const anon =
  fromStatus.ANON_KEY ||
  fromStatus.SUPABASE_ANON_KEY ||
  "";
const service =
  fromStatus.SERVICE_ROLE_KEY ||
  fromStatus.SUPABASE_SERVICE_ROLE_KEY ||
  "";
const dbUrl =
  fromStatus.DB_URL ||
  fromStatus.DATABASE_URL ||
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

const next = {
  ...existing,
  NEXT_PUBLIC_SUPABASE_URL: apiUrl,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: anon,
  SUPABASE_SERVICE_ROLE_KEY: service,
  SUPABASE_STORAGE_BUCKET: existing.SUPABASE_STORAGE_BUCKET || "documents",
  DATABASE_URL: dbUrl,
  NEXT_PUBLIC_APP_URL:
    existing.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
};

const order = [
  "GEMINI_API_KEY",
  "PINECONE_API_KEY",
  "PINECONE_INDEX",
  "DATABASE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_STORAGE_BUCKET",
  "STRIPE_SECRET_KEY",
  "STRIPE_PRICE_ID",
  "STRIPE_WEBHOOK_SECRET",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_APP_URL",
];

writeFileSync(envPath, formatEnv(next, order));
console.log("Updated .env.local with local Supabase keys:");
console.log("  NEXT_PUBLIC_SUPABASE_URL =", apiUrl);
console.log("  DATABASE_URL            =", dbUrl.replace(/:[^:@]+@/, ":****@"));
console.log("  ANON_KEY length         =", anon.length);
console.log("  SERVICE_ROLE length     =", service.length);
console.log("\nRestart npm run dev, then open /auth/login");
