import prisma from "../../shared/prisma"
import { assertProjectAccess } from "../../security/project_access"
import type { McpAuthContext } from "../../auth/authenticate_mcp_token"
import { readObject, requireString } from "../input"

/**
 * Lists all active geo-targeted prompt variants for a project.
 * Shows which prompts are tracked across which countries and cities.
 */
export async function getGeoVariants(auth: McpAuthContext, rawArgs: unknown) {
  const args = readObject(rawArgs)
  const project_id = requireString(args, "project_id")

  await assertProjectAccess(project_id, auth.user_id)

  const variants = await prisma.geoPromptVariant.findMany({
    where: {
      prompt: { project_id },
      is_active: true,
    },
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      country_code: true,
      country_name: true,
      city: true,
      is_active: true,
      created_at: true,
      prompt: {
        select: { id: true, text: true, topic: true },
      },
    },
  })

  return { variants, count: variants.length }
}
