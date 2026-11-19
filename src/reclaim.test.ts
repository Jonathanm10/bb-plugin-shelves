import { describe, expect, it } from "vitest";
import { describeReclaim } from "./reclaim";

describe("describeReclaim", () => {
  it("says nothing when settling released nothing", () => {
    expect(
      describeReclaim({
        closedTerminals: 0,
        keptTerminals: 0,
        stoppedRuntime: false,
      }),
    ).toBeUndefined();
  });

  it("reports the runtime alone when there were no terminals", () => {
    expect(
      describeReclaim({
        closedTerminals: 0,
        keptTerminals: 0,
        stoppedRuntime: true,
      }),
    ).toBe("Agent session stopped");
  });

  it("names what was closed and what was left", () => {
    expect(
      describeReclaim({
        closedTerminals: 1,
        keptTerminals: 2,
        stoppedRuntime: true,
      }),
    ).toBe("Agent session stopped · closed 1 terminal nobody used · 2 terminals left running");
  });

  it("warns about surviving terminals even when nothing was closed", () => {
    expect(
      describeReclaim({
        closedTerminals: 0,
        keptTerminals: 1,
        stoppedRuntime: false,
      }),
    ).toBe("1 terminal left running");
  });
});
