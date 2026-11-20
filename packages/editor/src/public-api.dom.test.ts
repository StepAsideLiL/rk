import { describe, expect, it } from "vitest";

import * as extensions from "./extensions/index";
import * as html from "./html/index";
import * as main from "./index";
import * as react from "./react/index";
import * as testing from "./testing/index";

const entries = [
  [".", Object.keys(main).sort()],
  ["./react", Object.keys(react).sort()],
  ["./extensions", Object.keys(extensions).sort()],
  ["./testing", Object.keys(testing).sort()],
  ["./html", Object.keys(html).sort()],
] as const;

describe("public API", () => {
  it.each(entries)("snapshots the %s entry", (_entry, keys) => {
    expect(keys).toMatchSnapshot();
  });
});
