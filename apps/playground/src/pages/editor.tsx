import { createMarkdownCodec, type Editor } from "@rk/editor";
import { starterKit } from "@rk/editor/extensions";
import { EditorContent, EditorProvider, useEditor, useEditorState } from "@rk/editor/react";
import { setBlockType } from "prosemirror-commands";
import { useMemo } from "react";

const extensions = starterKit();
const markdown = createMarkdownCodec({ extensions });

const initialContent = `# rk editor

A small **bold** and *italic* playground.

Select text and use the toolbar, or type Markdown shortcuts like \`**bold**\`, \`*italic*\` or \`# heading\`.
`;

const buttonClass =
  "border-border hover:bg-accent focus-visible:outline-ring aria-pressed:bg-primary aria-pressed:text-primary-foreground rounded-md border px-3 py-1.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2";

const selectClass =
  "border-border bg-background focus-visible:outline-ring rounded-md border px-2 py-1.5 text-sm focus-visible:outline-2 focus-visible:outline-offset-2";

type EditorState = Editor["state"];

export function EditorPage() {
  return (
    <EditorProvider
      extensions={extensions}
      markdown={markdown}
      content={initialContent}
      contentType="markdown"
    >
      <EditorDemo />
    </EditorProvider>
  );
}

function EditorDemo() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">@rk/editor</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Extensible ProseMirror editor with markdown as the interchange format.
        </p>
      </header>
      <div className="flex flex-wrap items-center gap-2">
        <Toolbar />
      </div>
      <div className="border-border bg-card text-card-foreground min-h-40 rounded-lg border p-4">
        <EditorContent />
      </div>
      <MarkdownPanel />
    </div>
  );
}

function Toolbar() {
  const editor = useEditor();
  const bold = useEditorState((state) => isMarkActive(editor, state, "strong"));
  const italic = useEditorState((state) => isMarkActive(editor, state, "emphasis"));
  const heading = useEditorState((state) => {
    const parent = state.selection.$from.parent;

    return parent.type.name === "heading" ? Number(parent.attrs.level) : 0;
  });

  const setHeading = (level: number) => {
    const nodeType = level === 0 ? editor.schema.nodes.paragraph : editor.schema.nodes.heading;

    if (!nodeType) {
      return;
    }

    const command = level === 0 ? setBlockType(nodeType) : setBlockType(nodeType, { level });

    command(editor.state, editor.dispatch, editor.view);
  };

  return (
    <>
      <button
        type="button"
        aria-pressed={bold}
        className={buttonClass}
        onClick={() => editor.commands.toggleBold()}
      >
        Bold
      </button>
      <button
        type="button"
        aria-pressed={italic}
        className={buttonClass}
        onClick={() => editor.commands.toggleItalic()}
      >
        Italic
      </button>
      <select
        aria-label="Block type"
        value={heading}
        className={selectClass}
        onChange={(event) => setHeading(Number(event.target.value))}
      >
        <option value={0}>Paragraph</option>
        {[1, 2, 3, 4, 5, 6].map((level) => (
          <option key={level} value={level}>
            Heading {level}
          </option>
        ))}
      </select>
    </>
  );
}

function MarkdownPanel() {
  const editor = useEditor();
  const doc = useEditorState((state) => state.doc);
  const output = useMemo(() => editor.getMarkdown(), [editor, doc]);

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold">Markdown</h2>
      <pre className="bg-muted text-muted-foreground overflow-auto rounded-lg p-4 text-sm whitespace-pre-wrap">
        {output}
      </pre>
    </section>
  );
}

function isMarkActive(editor: Editor, state: EditorState, name: "strong" | "emphasis"): boolean {
  const type = editor.schema.marks[name];

  if (!type) {
    return false;
  }

  const { from, to, empty, $from } = state.selection;

  if (empty) {
    return (state.storedMarks ?? $from.marks()).some((mark) => mark.type === type);
  }

  return state.doc.rangeHasMark(from, to, type);
}
