import { describe, expect, it } from "vitest";

import { defineExtension, type Extension } from "./types";

interface TestOptions {
  label: string;
}

const factory = (options: TestOptions): Extension<TestOptions> => ({
  name: options.label,
});

describe("defineExtension", () => {
  it("returns the factory unchanged", () => {
    expect(defineExtension(factory)).toBe(factory);
  });

  it("keeps calling the factory working", () => {
    const defined = defineExtension(factory);

    expect(defined({ label: "test" }).name).toBe("test");
  });
});
