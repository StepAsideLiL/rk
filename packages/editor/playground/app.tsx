import { createMarkdownCodec, type Editor } from "@rk/editor";
import { starterKit } from "@rk/editor/extensions";
import { EditorContent, EditorProvider, useEditor, useEditorState } from "@rk/editor/react";
import { setBlockType } from "prosemirror-commands";
import type { EditorState } from "prosemirror-state";
import { useMemo } from "react";

const extensions = starterKit();
const markdown = createMarkdownCodec({ extensions });

const initialContent = `# rk editor

A small **bold** and *italic* playground.

Select text and use the toolbar, or type Markdown shortcuts like \`**bold**\`, \`*italic*\` or \`# heading\`.
`;

const styles = {
  page: {
    fontFamily: "system-ui, sans-serif",
    margin: "0 auto",
    maxWidth: "48rem",
    padding: "3rem 1.5rem",
  },
  editor: {
    border: "1px solid #ddd",
    borderRadius: "8px",
    padding: "1rem",
    minHeight: "10rem",
  },
  button: {
    borderRadius: "6px",
    border: "1px solid #ccc",
    padding: "0.4rem 0.75rem",
    background: "#fff",
    cursor: "pointer",
  },
  buttonActive: {
    background: "#111",
    color: "#fff",
    borderColor: "#111",
  },
};

export function App() {
  return (
    <EditorProvider
      extensions={extensions}
      markdown={markdown}
      content={initialContent}
      contentType="markdown"
    >
      <main style={styles.page}>
        <h1 style={{ marginTop: 0 }}>@rk/editor</h1>
        <Toolbar />
        <div style={styles.editor}>
          <EditorContent />
        </div>
        <MarkdownPanel />
      </main>
    </EditorProvider>
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
    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
      <button
        type="button"
        aria-pressed={bold}
        style={bold ? { ...styles.button, ...styles.buttonActive } : styles.button}
        onClick={() => editor.commands.toggleBold()}
      >
        Bold
      </button>
      <button
        type="button"
        aria-pressed={italic}
        style={italic ? { ...styles.button, ...styles.buttonActive } : styles.button}
        onClick={() => editor.commands.toggleItalic()}
      >
        Italic
      </button>
      <select
        aria-label="Block type"
        value={heading}
        onChange={(event) => setHeading(Number(event.target.value))}
        style={{ ...styles.button, cursor: "pointer" }}
      >
        <option value={0}>Paragraph</option>
        {[1, 2, 3, 4, 5, 6].map((level) => (
          <option key={level} value={level}>
            Heading {level}
          </option>
        ))}
      </select>
    </div>
  );
}

function MarkdownPanel() {
  const editor = useEditor();
  const doc = useEditorState((state) => state.doc);
  const output = useMemo(() => editor.getMarkdown(), [editor, doc]);

  return (
    <section style={{ marginTop: "2rem" }}>
      <h2 style={{ fontSize: "1rem" }}>Markdown</h2>
      <pre
        style={{
          background: "#f6f6f6",
          borderRadius: "8px",
          padding: "1rem",
          overflow: "auto",
          whiteSpace: "pre-wrap",
        }}
      >
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
