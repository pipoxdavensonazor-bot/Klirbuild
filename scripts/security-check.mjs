#!/usr/bin/env node
/**
 * Lightweight security gates for local + CI.
 * Scans tracked source only (via git when available).
 */
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const root = process.cwd();
const errors = [];
const warnings = [];

function trackedFiles() {
  try {
    const out = execSync("git ls-files -z", {
      cwd: root,
      encoding: "buffer",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return out
      .toString("utf8")
      .split("\0")
      .filter(Boolean)
      .map((f) => path.join(root, f));
  } catch {
    return [];
  }
}

const files = trackedFiles();
if (!files.length) {
  console.error("Impossible de lister les fichiers git (git ls-files).");
  process.exit(1);
}

/** 1) No committed secrets / env dumps */
const forbiddenNames = [
  /^\.env$/i,
  /^\.env\.local$/i,
  /^\.env\.production$/i,
  /credentials\.json$/i,
  /service-account.*\.json$/i,
];
for (const file of files) {
  const base = path.basename(file);
  if (forbiddenNames.some((re) => re.test(base))) {
    errors.push(`Fichier sensible suivi par git : ${path.relative(root, file)}`);
  }
}

/** 2) Dangerous patterns in app source */
const dangerous = [
  { re: /\beval\s*\(/g, msg: "usage de eval()", severity: "error" },
  { re: /\bnew Function\s*\(/g, msg: "usage de new Function()", severity: "error" },
  {
    re: /dangerouslySetInnerHTML/g,
    msg: "dangerouslySetInnerHTML (vérifier sanitization)",
    severity: "warn",
  },
  {
    re: /sk_live_[a-zA-Z0-9]{10,}/g,
    msg: "possible Stripe secret live en clair",
    severity: "error",
  },
  {
    re: /(?<![\w.])re_[A-Za-z0-9]{20,}/g,
    msg: "possible Resend API key en clair",
    severity: "error",
  },
  {
    re: /BEGIN (RSA |OPENSSH )?PRIVATE KEY/g,
    msg: "clé privée détectée",
    severity: "error",
  },
];

const codeFiles = files.filter((f) => {
  const rel = path.relative(root, f).replace(/\\/g, "/");
  if (rel === "scripts/security-check.mjs") return false;
  if (!/\.(ts|tsx|js|mjs|cjs)$/.test(f)) return false;
  return (
    rel.startsWith("src/") ||
    rel.startsWith("scripts/") ||
    rel.startsWith("prisma/")
  );
});

for (const file of codeFiles) {
  const rel = path.relative(root, file).replace(/\\/g, "/");
  const allowDangerousHtml =
    rel.includes("/inbox/") ||
    rel.includes("email") ||
    rel.includes("templates");

  let text;
  try {
    text = fs.readFileSync(file, "utf8");
  } catch {
    continue;
  }

  for (const rule of dangerous) {
    if (rule.msg.includes("dangerouslySetInnerHTML") && allowDangerousHtml) {
      continue;
    }
    if (rule.re.test(text)) {
      rule.re.lastIndex = 0;
      const line = `${rel}: ${rule.msg}`;
      if (rule.severity === "error") errors.push(line);
      else warnings.push(line);
    }
  }
}

/** 3) Netlify security headers baseline */
const netlifyPath = path.join(root, "netlify.toml");
if (fs.existsSync(netlifyPath)) {
  const toml = fs.readFileSync(netlifyPath, "utf8");
  for (const header of [
    "X-Frame-Options",
    "X-Content-Type-Options",
    "Referrer-Policy",
    "Permissions-Policy",
    "Strict-Transport-Security",
  ]) {
    if (!toml.includes(header)) {
      errors.push(`netlify.toml: header manquant « ${header} »`);
    }
  }
} else {
  errors.push("netlify.toml introuvable");
}

/** 4) Cron routes must authorize */
const cronRoutes = files.filter((f) => {
  const rel = path.relative(root, f).replace(/\\/g, "/");
  return rel.startsWith("src/app/api/cron/") && rel.endsWith("route.ts");
});
for (const file of cronRoutes) {
  const text = fs.readFileSync(file, "utf8");
  if (
    !text.includes("authorizeCronRequest") &&
    !text.includes("CRON_SECRET")
  ) {
    errors.push(
      `${path.relative(root, file)}: cron sans authorizeCronRequest / CRON_SECRET`
    );
  }
}

console.log("KlirBuild security:check");
if (warnings.length) {
  console.log("\nAvertissements:");
  for (const w of warnings) console.log(`  - ${w}`);
}
if (errors.length) {
  console.log("\nErreurs:");
  for (const e of errors) console.log(`  - ${e}`);
  console.log(`\n${errors.length} erreur(s) sécurité — CI échoue.`);
  process.exit(1);
}

console.log("\nOK — aucun bloquant.");
if (warnings.length) {
  console.log(`${warnings.length} avertissement(s) à revoir.`);
}
