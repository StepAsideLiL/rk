import { EDITOR_NAME } from "@rk/editor";

export function App() {
  return (
    <main
      style={{
        fontFamily: "system-ui, sans-serif",
        margin: "0 auto",
        maxWidth: "48rem",
        padding: "3rem 1.5rem",
      }}
    >
      <h1 style={{ margin: 0 }}>{EDITOR_NAME}</h1>
      <p style={{ color: "#555", lineHeight: 1.6 }}>
        Scaffolding only. Editor features land in later steps.
      </p>
    </main>
  );
}
