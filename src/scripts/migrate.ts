import "../config/env"
import { readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import prisma from "../shared/prisma"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const migrationPath = path.resolve(__dirname, "../../migrations/001_init_mcp.sql")

async function main() {
  const sql = readFileSync(migrationPath, "utf8")
  const statements = sql
    .split(/;\s*(?:\r?\n|$)/g)
    .map(statement => statement.trim())
    .filter(Boolean)

  for (const statement of statements) {
    await prisma.$executeRawUnsafe(statement)
  }

  console.log(`[mcp:migrate] applied ${statements.length} statement(s)`)
}

main()
  .catch(error => {
    console.error("[mcp:migrate] failed", error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
