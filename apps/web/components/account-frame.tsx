import type { ReactNode } from 'react';

export function AccountFrame({
  eyebrow,
  title,
  accent,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  accent: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <main className="auth-page">
      <section className="auth-story">
        <span className="eyebrow">{eyebrow}</span>
        <h1>
          {title}
          <span>{accent}</span>
        </h1>
        <p>{intro}</p>
        <span className="account-principle">YOUR TIME. YOUR CHOICE. YOUR CONNECTION.</span>
      </section>
      <section className="auth-form">{children}</section>
    </main>
  );
}
