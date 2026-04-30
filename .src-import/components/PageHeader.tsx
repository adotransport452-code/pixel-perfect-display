import { ReactNode } from "react";

export function PageHeader({
  title,
  breadcrumbs,
  actions,
}: {
  title: string;
  breadcrumbs?: { label: string; href?: string }[];
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-border bg-gradient-header px-6 py-5 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-primary">{title}</h1>
        {breadcrumbs && (
          <nav className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            {breadcrumbs.map((b, i) => (
              <span key={i} className="flex items-center gap-2">
                {i > 0 && <span className="text-border">/</span>}
                <span>{b.label}</span>
              </span>
            ))}
          </nav>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}