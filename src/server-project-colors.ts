import type { ServerContext, ServerHandlers } from "./server-context";

export function createServerProjectColors(ctx: ServerContext) {
  const handlers = {
    async getProjectColors() {
      const rows = ctx.db.prepare("SELECT project_id, color FROM project_colors").all() as Array<{
        project_id: string;
        color: string;
      }>;
      return { colors: Object.fromEntries(rows.map((row) => [row.project_id, row.color])) };
    },
  } satisfies Pick<ServerHandlers, "getProjectColors">;

  return { handlers };
}
