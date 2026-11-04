/**
 * Shared Next build used by OpenNext (`opennextjs-cloudflare build` invokes `npm run build`).
 * Schema changes are applied by `prisma migrate deploy` in the deploy workflow, which fails the job.
 */
import { execSync } from "node:child_process";

function run(command, env = process.env) {
  execSync(command, { stdio: "inherit", env });
}

run("npx prisma generate");
run("npx next build");
