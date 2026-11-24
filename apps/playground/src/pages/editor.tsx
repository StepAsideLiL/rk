import { PlaygroundKit } from "@rk/editor/extensions";
import {
  EditorContent,
  EditorRoot,
  useCurrentEditor,
  useEditor,
  useEditorState,
} from "@rk/editor/react";
import { useMemo, useState } from "react";

const extensions = [PlaygroundKit()];

const markdownContent = `# rk editor

A small **bold** and *italic* playground.

Select text and use the toolbar, or type Markdown shortcuts like \`**bold**\`, \`*italic*\` or \`# heading\`.
`;

const htmlContent = `<h1>rk editor</h1>
<p>A small <strong>bold</strong> and <em>italic</em> playground.</p>
<p>Select text and use the toolbar, or switch the input format back to Markdown.</p>`;

type InputFormat = "markdown" | "html";

export function EditorPage() {
  const [inputFormat, setInputFormat] = useState<InputFormat>("markdown");
  const content = inputFormat === "markdown" ? markdownContent : htmlContent;
  const editor = useEditor({
    extensions,
    content,
    contentType: inputFormat,
  });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">@rk/editor</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Extensible ProseMirror editor with markdown and HTML as interchange formats.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          Input
          <select
            aria-label="Input format"
            value={inputFormat}
            className="border-border bg-background focus-visible:outline-ring rounded-md border px-2 py-1.5 text-sm focus-visible:outline-2 focus-visible:outline-offset-2"
            onChange={(event) => setInputFormat(event.target.value as InputFormat)}
          >
            <option value="markdown">Markdown</option>
            <option value="html">HTML</option>
          </select>
        </label>
      </header>
      <EditorRoot editor={editor}>
        <EditorDemo />
      </EditorRoot>
    </div>
  );
}

function EditorDemo() {
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Toolbar />
      </div>
      <div className="border-border bg-card text-card-foreground min-h-40 rounded-lg border p-4">
        <EditorContent />
      </div>
      <div className="grid gap-6">
        <MarkdownPanel />
        <HtmlPanel />
      </div>
    </>
  );
}

function Toolbar() {
  const editor = useCurrentEditor();
  const bold = useEditorState(() => editor.isActive("strong"));
  const italic = useEditorState(() => editor.isActive("emphasis"));
  const heading = useEditorState(() => {
    const level = editor.getAttributes("heading").level;

    return typeof level === "number" ? level : 0;
  });

  const setHeading = (level: number) => {
    const nodeType = level === 0 ? editor.schema.nodes.paragraph : editor.schema.nodes.heading;

    if (!nodeType) {
      return;
    }

    const { state } = editor;
    const { from, to } = state.selection;
    const transaction = state.tr.setBlockType(from, to, nodeType, level === 0 ? null : { level });

    if (transaction.docChanged) {
      editor.dispatch(transaction);
    }
  };

  return (
    <>
      <button
        type="button"
        aria-pressed={bold}
        className="border-border hover:bg-accent focus-visible:outline-ring aria-pressed:bg-primary aria-pressed:text-primary-foreground rounded-md border px-3 py-1.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2"
        onClick={() => editor.commands.toggleBold()}
      >
        Bold
      </button>
      <button
        type="button"
        aria-pressed={italic}
        className="border-border hover:bg-accent focus-visible:outline-ring aria-pressed:bg-primary aria-pressed:text-primary-foreground rounded-md border px-3 py-1.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2"
        onClick={() => editor.commands.toggleItalic()}
      >
        Italic
      </button>
      <select
        aria-label="Block type"
        value={heading}
        className="border-border bg-background focus-visible:outline-ring rounded-md border px-2 py-1.5 text-sm focus-visible:outline-2 focus-visible:outline-offset-2"
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
  const editor = useCurrentEditor();
  const doc = useEditorState((state) => state.doc);
  const output = useMemo(() => editor.getMarkdown(), [editor, doc]);

  return <OutputPanel title="Markdown" output={output} />;
}

function HtmlPanel() {
  const editor = useCurrentEditor();
  const doc = useEditorState((state) => state.doc);
  const output = useMemo(() => editor.getHTML(), [editor, doc]);

  return <OutputPanel title="HTML" output={output} />;
}

function OutputPanel({ title, output }: { readonly title: string; readonly output: string }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold">{title}</h2>
      <pre className="bg-muted text-muted-foreground overflow-auto rounded-lg p-4 text-sm whitespace-pre-wrap">
        {output}
      </pre>
    </section>
  );
}
