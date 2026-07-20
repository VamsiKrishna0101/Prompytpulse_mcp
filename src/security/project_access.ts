import prisma from "../shared/prisma"

export async function assertProjectAccess(project_id: string, user_id: string) {
  const project = await prisma.project.findFirst({
    where: { id: project_id, user_id },
    select: {
      id: true,
      brand_name: true,
      brand_url: true,
      brand_location: true,
      created_at: true,
      updated_at: true,
    },
  })

  if (!project) {
    const error = new Error("PROJECT_NOT_FOUND")
    ;(error as Error & { status?: number; code?: string }).status = 403
    ;(error as Error & { status?: number; code?: string }).code = "project_forbidden"
    throw error
  }

  return project
}
