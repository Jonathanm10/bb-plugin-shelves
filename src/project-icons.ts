const PROJECT_ICON_ROUTE = "/api/v1/plugins/bb-thread-inbox/http/project-icon";

/** Set on the icon route's 404 when the project has no icon, as opposed to a route bb has not loaded yet. */
export const PROJECT_ICON_MISSING_HEADER = "x-bb-thread-inbox-icon-missing";

const PROJECT_ICON_EXTENSIONS = [".svg", ".png", ".ico", ".jpg", ".jpeg", ".gif", ".avif", ".webp"] as const;

export function normalizeProjectIconPath(input: string): string | null {
  const value = input.trim().replaceAll("\\", "/");
  if (
    value.length === 0 ||
    value.startsWith("/") ||
    /^[a-zA-Z]:\//.test(value) ||
    /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(value)
  ) {
    return null;
  }
  const parts = value.split("/").filter((part) => part !== ".");
  if (parts.length === 0 || parts.some((part) => part === ".." || !part)) {
    return null;
  }
  const path = parts.join("/");
  const lower = path.toLowerCase();
  return PROJECT_ICON_EXTENSIONS.some((extension) => lower.endsWith(extension)) ? path : null;
}

export function projectIconUrl(projectId: string, revision = 0): string {
  const query = new URLSearchParams({
    projectId,
    revision: String(revision),
  });
  return `${PROJECT_ICON_ROUTE}?${query}`;
}
