import type { ServerContext } from "./server-context";
import { normalizeProjectIconPath } from "./project-icons";
interface StoredProjectIconRow {
  project_id: string;
  path: string;
  updated_at: number;
}

interface StoredProjectIconUploadRow {
  project_id: string;
  filename: string;
  mime_type: string;
  content_base64: string;
  size_bytes: number;
  updated_at: number;
}

interface ResolvedProjectIcon {
  content: string;
  contentEncoding: "base64" | "utf8";
  mimeType: string;
  path: string;
  sizeBytes: number;
}

const PROJECT_ICON_MAX_BYTES = 1_000_000;

const PROJECT_ICON_CACHE_MS = 5 * 60_000;

const PROJECT_ICON_MISS_CACHE_MS = 30_000;

// Only a file that does not exist is a real miss. Any other read failure, such
// as a host that is still connecting, must not be cached as "no icon".
function isMissingFileError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const { status, code, message } = error as {
    status?: unknown;
    code?: unknown;
    message?: unknown;
  };
  return (
    status === 404 ||
    code === "ENOENT" ||
    (typeof message === "string" && /ENOENT|not found|does not exist/i.test(message))
  );
}

function iconMimeType(path: string, reported: string): string {
  const lower = path.toLowerCase();
  if (lower.endsWith(".svg")) return "image/svg+xml";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".ico")) return "image/x-icon";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".avif")) return "image/avif";
  if (lower.endsWith(".webp")) return "image/webp";
  return reported;
}

export function createServerProjectIcons(ctx: ServerContext) {
  const projectIconCache = new Map<string, { expiresAt: number; icon: ResolvedProjectIcon | null }>();

  const pendingProjectIconResolutions = new Map<string, Promise<ResolvedProjectIcon | null>>();

  const defaultProjectHostIds = new Map<string, Promise<string | null>>();

  const readProjectIconOverride = (projectId: string): string | null =>
    (
      ctx.db
        .prepare(
          `SELECT project_id, path, updated_at
             FROM project_icons
            WHERE project_id = ?`,
        )
        .get(projectId) as StoredProjectIconRow | undefined
    )?.path ?? null;

  const readProjectIconUpload = (projectId: string): StoredProjectIconUploadRow | null =>
    (ctx.db
      .prepare(
        `SELECT project_id, filename, mime_type, content_base64,
                size_bytes, updated_at
           FROM project_icon_uploads
          WHERE project_id = ?`,
      )
      .get(projectId) as StoredProjectIconUploadRow | undefined) ?? null;

  const defaultProjectHostId = async (projectId: string): Promise<string | null> => {
    let pending = defaultProjectHostIds.get(projectId);
    if (!pending) {
      pending = ctx.bb.sdk.projects
        .get({ projectId })
        .then(
          (project) => project.sources.find((source) => source.isDefault)?.hostId ?? project.sources[0]?.hostId ?? null,
        );
      defaultProjectHostIds.set(projectId, pending);
      void pending.catch(() => defaultProjectHostIds.delete(projectId));
    }
    return pending;
  };

  const readProjectFile = async (projectId: string, environmentId: string | null, path: string) => {
    if (environmentId) {
      return ctx.bb.sdk.projects.fileContent({ projectId, environmentId, path });
    }
    const hostId = await defaultProjectHostId(projectId);
    return hostId
      ? ctx.bb.sdk.projects.fileContent({ projectId, hostId, path })
      : ctx.bb.sdk.projects.fileContent({ projectId, path });
  };

  const tryProjectIcon = async (
    projectId: string,
    environmentId: string | null,
    path: string,
  ): Promise<ResolvedProjectIcon | null> => {
    const normalized = normalizeProjectIconPath(path);
    if (!normalized) return null;
    try {
      const file = await readProjectFile(projectId, environmentId, normalized);
      if (file.sizeBytes > PROJECT_ICON_MAX_BYTES) return null;
      return {
        ...file,
        mimeType: iconMimeType(normalized, file.mimeType),
        path: normalized,
      };
    } catch (error) {
      if (isMissingFileError(error)) return null;
      throw error;
    }
  };

  const resolveProjectIconUncached = async (
    projectId: string,
    environmentId: string | null,
  ): Promise<ResolvedProjectIcon | null> => {
    const cacheKey = `${projectId}\0${environmentId ?? ""}`;
    const upload = readProjectIconUpload(projectId);
    if (upload) {
      const icon = {
        content: upload.content_base64,
        contentEncoding: "base64" as const,
        mimeType: upload.mime_type,
        path: upload.filename,
        sizeBytes: upload.size_bytes,
      };

      projectIconCache.set(cacheKey, {
        expiresAt: Date.now() + PROJECT_ICON_CACHE_MS,
        icon,
      });
      return icon;
    }
    const customPath = readProjectIconOverride(projectId);
    const icon = customPath ? await tryProjectIcon(projectId, environmentId, customPath) : null;

    projectIconCache.set(cacheKey, {
      expiresAt: Date.now() + (icon ? PROJECT_ICON_CACHE_MS : PROJECT_ICON_MISS_CACHE_MS),
      icon,
    });
    return icon;
  };

  const resolveProjectIcon = (projectId: string, environmentId: string | null): Promise<ResolvedProjectIcon | null> => {
    const cacheKey = `${projectId}\0${environmentId ?? ""}`;
    const cached = projectIconCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return Promise.resolve(cached.icon);
    }
    const pending = pendingProjectIconResolutions.get(cacheKey);
    if (pending) return pending;
    const resolution = resolveProjectIconUncached(projectId, environmentId).finally(() => {
      if (pendingProjectIconResolutions.get(cacheKey) === resolution) {
        pendingProjectIconResolutions.delete(cacheKey);
      }
    });
    pendingProjectIconResolutions.set(cacheKey, resolution);
    return resolution;
  };

  return { resolveProjectIcon };
}
