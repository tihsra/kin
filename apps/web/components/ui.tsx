'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from './providers';
import { Icon } from './icon';
import { PageHeader } from './page-header';

export function Notice({
  children,
  error = false,
}: {
  children: React.ReactNode;
  error?: boolean;
}) {
  return (
    <div className={`notice${error ? ' error' : ''}`} role={error ? 'alert' : 'status'}>
      {children}
    </div>
  );
}
export function Empty({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="empty-state">
      <span className="empty-symbol">
        <Icon name="drop" size={30} />
      </span>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
export function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading, error, reload } = useAuth();
  if (loading)
    return (
      <main className="page narrow">
        <div className="loading-line" />
        <p>Getting things ready…</p>
      </main>
    );
  if (error)
    return (
      <main className="page narrow">
        <PageHeader
          eyebrow="YOUR KIN NETWORK"
          title="A moment,"
          accent="please."
          description="The service is temporarily unavailable. Please try again shortly."
        />
        <Notice error>{error}</Notice>
        <button className="button dark" onClick={() => void reload()}>
          Try again <Icon name="arrow" />
        </button>
      </main>
    );
  if (!user?.verified_at)
    return (
      <main className="page narrow">
        <PageHeader
          eyebrow="YOUR KIN NETWORK"
          title="Join your"
          accent="people."
          description="Sign in to see requests and coordinate privately. Contact details are never a public directory."
        />
        <div className="button-row">
          <Link className="button dark" href="/login">
            Sign in <Icon name="arrow" />
          </Link>
          <Link className="button outline" href="/register">
            Create an account
          </Link>
        </div>
      </main>
    );
  return <>{children}</>;
}
export function Status({ value }: { value: string }) {
  return <span className={`status status-${value}`}>{value.replaceAll('_', ' ')}</span>;
}
export function ConfirmButton({
  children,
  question,
  onConfirm,
  className = 'button outline small',
  disabled = false,
}: {
  children: React.ReactNode;
  question: string;
  onConfirm: () => void;
  className?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal();
    if (!open && dialog.current?.open) dialog.current.close();
  }, [open]);
  return (
    <>
      <button className={className} disabled={disabled} onClick={() => setOpen(true)}>
        {children}
      </button>
      <dialog
        ref={dialog}
        className="modal"
        aria-label="Confirm action"
        onClose={() => setOpen(false)}
        onCancel={() => setOpen(false)}
      >
        <h3>Just to make sure.</h3>
        <p>{question}</p>
        <div className="button-row">
          <button autoFocus className="button outline small" onClick={() => setOpen(false)}>
            Go back
          </button>
          <button
            className="button dark small"
            onClick={() => {
              setOpen(false);
              onConfirm();
            }}
          >
            Confirm <Icon name="check" size={16} />
          </button>
        </div>
      </dialog>
    </>
  );
}
