import { describe, expect, it } from "vitest";
import { normalizeProjectIconPath, projectIconUrl } from "./project-icons";

describe("project icon paths", () => {
  it("accepts supported project-relative image paths", () => {
    expect(normalizeProjectIconPath("./public/brand.svg")).toBe("public/brand.svg");
    expect(normalizeProjectIconPath("assets\\icon.PNG")).toBe("assets/icon.PNG");
  });

  it("rejects traversal, absolute paths, URLs, and non-images", () => {
    expect(normalizeProjectIconPath("../secret.svg")).toBeNull();
    expect(normalizeProjectIconPath("/tmp/icon.svg")).toBeNull();
    expect(normalizeProjectIconPath("https://example.com/icon.svg")).toBeNull();
    expect(normalizeProjectIconPath("README.md")).toBeNull();
  });

  it("builds one scoped route per project and revision", () => {
    expect(projectIconUrl("proj one", 3)).toBe(
      "/api/v1/plugins/shelves/http/project-icon?projectId=proj+one&revision=3",
    );
  });
});
