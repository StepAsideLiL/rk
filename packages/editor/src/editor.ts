import { EditorCore, jsonCodec, type EditorOptions } from "./core/editor";
import { HtmlCodec } from "./html/codec";
import { MarkdownCodec } from "./markdown/codec";

/**
 * Editor with the default markdown, HTML and JSON codecs.
 *
 * Core stays codec-free: this class is the assembly point that knows about the
 * concrete codec modules. Pass `codecs` or the legacy `markdown` option to
 * override any of them.
 */
export class Editor extends EditorCore {
  constructor(options: EditorOptions) {
    super(withDefaultCodecs(options));
  }
}

/** Fill in the codec defaults without mutating the caller's options. */
function withDefaultCodecs(options: EditorOptions): EditorOptions {
  const extensions = options.extensions;

  return {
    ...options,
    codecs: {
      json: options.codecs?.json ?? jsonCodec,
      markdown: options.codecs?.markdown ?? options.markdown ?? new MarkdownCodec({ extensions }),
      html: options.codecs?.html ?? new HtmlCodec({ extensions }),
    },
  };
}
