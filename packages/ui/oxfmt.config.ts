import { defineConfig } from "oxfmt";

import rootConfig from "../../oxfmt.config.ts";

// Oxfmt has no `extends` option, so reuse the root config object directly.
export default defineConfig({
  ...rootConfig,
});
