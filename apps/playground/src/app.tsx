import { useTheme } from "./utils/theme";

export default function App() {
  useTheme();

  return (
    <div className="bg-background text-foreground flex min-h-screen items-center justify-center">
      <h1 className="text-center text-6xl font-bold tracking-tight">
        Hello, Playground
      </h1>
    </div>
  );
}
