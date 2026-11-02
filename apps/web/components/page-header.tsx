import type { ReactNode } from 'react';

export function PageHeader({
  eyebrow,
  title,
  accent,
  description,
  status,
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  accent?: ReactNode;
  description?: ReactNode;
  status?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div className="page-heading-copy">
        <div className="page-heading-top">
          <span className="eyebrow">{eyebrow}</span>
          {status}
        </div>
        <h1>
          {title}
          {accent && <span className="page-title-accent">{accent}</span>}
        </h1>
        {description && <p className="page-description">{description}</p>}
      </div>
      {children && <div className="page-actions">{children}</div>}
    </header>
  );
}
