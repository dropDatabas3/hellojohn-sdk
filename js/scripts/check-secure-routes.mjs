import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative } from "node:path"

const ROOT = process.cwd()
const TARGET_DIR = "src"
const FILE_EXT_RE = /\.(ts|tsx|js|jsx|mjs|cjs)$/
const SECURE_ROUTE_RE = /\/v2\/(?:csrf|session\/token|auth\/logout(?:-all)?)/g

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) {
      walk(full, out)
      continue
    }
    if (FILE_EXT_RE.test(full)) out.push(full)
  }
  return out
}

function isAllowedLine(relPath, line) {
  if (relPath !== "src/client.ts") return false
  return /^(AUTH_LOGOUT|AUTH_LOGOUT_ALL|CSRF|SESSION_TOKEN):\s*\"\/v2\//.test(line.trim())
}

const findings = []
const files = walk(join(ROOT, TARGET_DIR))

for (const file of files) {
  const rel = relative(ROOT, file).replace(/\\/g, "/")
  const lines = readFileSync(file, "utf8").split(/\r?\n/)

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!SECURE_ROUTE_RE.test(line)) {
      SECURE_ROUTE_RE.lastIndex = 0
      continue
    }
    if (!isAllowedLine(rel, line)) {
      findings.push(`${rel}:${i + 1}: ${line.trim()}`)
    }
    SECURE_ROUTE_RE.lastIndex = 0
  }
}

if (findings.length > 0) {
  console.error("Found disallowed secure endpoint literals in SDK JS source:")
  for (const f of findings) console.error(`- ${f}`)
  process.exit(1)
}

console.log("Secure route guard passed for SDK JS.")
