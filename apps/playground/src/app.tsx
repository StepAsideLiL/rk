import { Route, Routes } from "react-router";

import { AppShell } from "./components/app-shell";
import { EditorPage } from "./pages/editor";
import { HomePage } from "./pages/home";

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<HomePage />} />
        <Route path="editor" element={<EditorPage />} />
      </Route>
    </Routes>
  );
}
