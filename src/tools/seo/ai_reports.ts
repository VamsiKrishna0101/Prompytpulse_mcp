import prisma from "../../shared/prisma"
import { assertProjectAccess } from "../../security/project_access"
import type { McpAuthContext } from "../../auth/authenticate_mcp_token"
import { optionalLimit, readObject, requireString } from "../input"

/**
 * Returns saved AI visibility reports for a project.
 * Includes period metadata, brand name, status, summary, and the full report JSON.
 */
export async function getAiReports(auth: McpAuthContext, rawArgs: unknown) {
  const args = readObject(rawArgs)
  const project_id = requireString(args, "project_id")
  const limit = optionalLimit(args, "limit", 10, 20)

  await assertProjectAccess(project_id, auth.user_id)

  const reports = await prisma.aIReport.findMany({
    where: { project_id, user_id: auth.user_id },
    orderBy: { created_at: "desc" },
    take: limit,
    select: {
      id: true,
      brand_name: true,
      period_type: true,
      period_start: true,
      period_end: true,
      previous_period_start: true,
      previous_period_end: true,
      status: true,
      summary: true,
      report: true,
      errors: true,
      created_at: true,
      updated_at: true,
    },
  })

  return { reports, count: reports.length }
}
