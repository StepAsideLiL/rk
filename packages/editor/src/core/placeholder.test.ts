import { describe, expect, it } from "vitest";

describe("node test project", () => {
  it("runs outside the DOM", () => {
    expect("window" in globalThis).toBe(false);
  });
});
