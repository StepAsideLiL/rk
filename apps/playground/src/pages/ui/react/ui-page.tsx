import type { ReactNode } from "react";
import { Link } from "react-router";

type UiPageProps = {
  title: string;
  description: string;
  children: ReactNode;
};

export function UiPage({ title, description, children }: UiPageProps) {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <header className="flex flex-col gap-2">
        <Link
          to="/ui/react"
          className="text-muted-foreground hover:text-foreground w-fit text-xs font-medium tracking-wide uppercase"
        >
          @rk/ui · React
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
      </header>
      {children}
    </div>
  );
}
