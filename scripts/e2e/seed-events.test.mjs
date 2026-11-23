import assert from "node:assert/strict";
import test from "node:test";
import { unexpectedSeedEvents } from "./seed-events.mjs";

const types = (events) => unexpectedSeedEvents(events).map((event) => event.type);

test("seed events tolerate provider warnings and any unhandled provider notification", () => {
  assert.deepEqual(
    types([
      { type: "provider/warning", data: {} },
      { type: "provider/unhandled", data: { rawType: "account/updated" } },
      { type: "provider/unhandled", data: { rawType: "some/new-notification" } },
      { type: "turn/started", data: {} },
    ]),
    [],
  );
});

test("seed events reject agent output and provider errors", () => {
  assert.deepEqual(
    types([
      { type: "item/completed", data: {} },
      { type: "provider/error", data: {} },
      { type: "provider/warning", data: {} },
    ]),
    ["item/completed", "provider/error"],
  );
});
