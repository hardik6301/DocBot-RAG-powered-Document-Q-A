import { execSync } from "node:child_process";

// prisma generate only needs a placeholder URL; real DB is used at runtime / db push
if (!process.env.DATABASE_URL?.trim()) {
  process.env.DATABASE_URL = "postgresql://prisma:prisma@localhost:5432/prisma";
}

execSync("npx prisma generate", { stdio: "inherit", env: process.env });
