import { describe, expect, it } from "vitest";

describe("dom test project", () => {
  it("runs in jsdom with jest-dom matchers", () => {
    expect(document.body).toBeInTheDocument();
  });
});
