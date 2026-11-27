import { Route, Routes } from "react-router";

import { AppShell } from "./components/app-shell";
import { EditorPage } from "./pages/editor";
import { HomePage } from "./pages/home";
import { ReactComponentsPage } from "./pages/ui/react";
import { ButtonPage } from "./pages/ui/react/button";
import { DialogPage } from "./pages/ui/react/dialog";
import { HColumnPage } from "./pages/ui/react/h-column";
import { SidebarPage } from "./pages/ui/react/sidebar";
import { TempPage } from "./pages/ui/react/temp";

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<HomePage />} />
        <Route path="editor" element={<EditorPage />} />
        <Route path="ui/react" element={<ReactComponentsPage />} />
        <Route path="ui/react/button" element={<ButtonPage />} />
        <Route path="ui/react/sidebar" element={<SidebarPage />} />
        <Route path="ui/react/dialog" element={<DialogPage />} />
        <Route path="ui/react/h-column" element={<HColumnPage />} />
        <Route path="ui/react/temp" element={<TempPage />} />
      </Route>
    </Routes>
  );
}
