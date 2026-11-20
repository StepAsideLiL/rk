import {
  createEditor as createCoreEditor,
  jsonCodec,
  type CreateEditorOptions,
  type Editor,
} from "./core/index";
import { createHtmlCodec } from "./html/index";
import { createMarkdownCodec } from "./markdown/index";

/**
 * Create an editor with the default markdown, HTML and JSON codecs.
 *
 * Core stays codec-free: this wrapper is the assembly point that knows about
 * the concrete codec modules. Pass `codecs` or the legacy `markdown` option to
 * override any of them.
 */
export function createEditor(options: CreateEditorOptions): Editor {
  const extensions = options.extensions;
  const codecs = {
    json: options.codecs?.json ?? jsonCodec,
    markdown: options.codecs?.markdown ?? options.markdown ?? createMarkdownCodec({ extensions }),
    html: options.codecs?.html ?? createHtmlCodec({ extensions }),
  };

  return createCoreEditor({ ...options, codecs });
}
