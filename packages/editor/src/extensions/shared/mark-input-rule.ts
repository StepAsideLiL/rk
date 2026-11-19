import type { MarkType } from "prosemirror-model";
import { InputRule } from "prosemirror-inputrules";

/**
 * Create an input rule that replaces `**text**`-style markup with marked text.
 *
 * The first or second capture group supplies the text, so one rule can support
 * both `*` and `_` markers.
 */
export function markInputRule(regexp: RegExp, markType: MarkType): InputRule {
  return new InputRule(regexp, (state, match, start, end) => {
    const text = match[1] ?? match[2];

    if (!text) {
      return null;
    }

    const marks = (state.storedMarks ?? state.doc.resolve(start).marks()).concat(markType.create());

    return state.tr.replaceWith(start, end, state.schema.text(text, marks));
  });
}
