import type { MarkType } from "prosemirror-model";
import { InputRule } from "prosemirror-inputrules";

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
