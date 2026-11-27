import { partAttrs } from "@ui-sdk/core/testing";
import { expect, test } from "vitest";

import { button } from "./button";
import { dialog } from "./dialog";
import { hColumn } from "./h-column";
import { sidebar } from "./sidebar";

test("button keeps its tooltip state", () => {
  const instance = button({ id: "button", tooltip: "Click me" });

  expect(instance.get().tooltip).toBe("Click me");
  expect(instance.get().tooltipSide).toBe("top");
});

test("button without a tooltip points at no description", () => {
  const instance = button({ id: "button" });
  const attrs = partAttrs(instance.part("root"), {}, instance.get());

  expect(attrs.type).toBe("button");
  expect(attrs["aria-describedby"]).toBeUndefined();
});

test("button with a tooltip describes it", () => {
  const instance = button({ id: "button", tooltip: "Click me" });
  const attrs = partAttrs(instance.part("root"), {}, instance.get());

  expect(attrs["aria-describedby"]).toBe("button-content");
});

test("dialog stores its name and exposes the content ratio", () => {
  const instance = dialog({ id: "dialog", name: "Setting" });
  const part = instance.part("content", { ratio: 16 / 9 });
  const attrs = partAttrs(part, { ratio: 16 / 9 }, instance.get());

  expect(instance.get().name).toBe("Setting");
  expect(attrs.style).toContain("--dialog-ratio:");
});

test("sidebar toggles to 0 width and clamps its width", () => {
  const instance = sidebar({ id: "sidebar", defaultWidth: 280, maxWidth: 400 });

  expect(instance.get().collapsed).toBe(false);

  instance.api.toggle();

  expect(instance.get().collapsed).toBe(true);
  expect(partAttrs(instance.part("container"), {}, instance.get()).inert).toBe("");

  instance.api.setWidth(9000);

  expect(instance.get().width).toBe(400);
});

test("h-column cells carry their alignment", () => {
  const instance = hColumn({ id: "columns" });
  const attrs = partAttrs(instance.part("cell"), { h: "center", v: "top" }, instance.get());

  expect(attrs["data-h"]).toBe("center");
  expect(attrs["data-v"]).toBe("top");
});
