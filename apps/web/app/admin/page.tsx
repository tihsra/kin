'use client';
import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import { useState } from 'react';
import { Protected, Notice, Empty, Status, ConfirmButton } from '@/components/ui';
import { useAuth } from '@/components/providers';
import { useRemote } from '@/lib/use-remote';
import { post } from '@/lib/api';

type Overview = {
  reports: {
    id: string;
    reason: string;
    status: string;
    hospital: string;
    request_id: string;
    name: string;
    target_name: string;
  }[];
  jobs: { kind: string; status: string; count: number }[];
};
export default function Admin() {
  return (
    <Protected>
      <Moderation />
    </Protected>
  );
}
function Moderation() {
  const { user } = useAuth();
  const { data, error, loading, refresh } = useRemote<Overview>(
    user?.role === 'admin' ? '/admin' : null,
    true,
  );
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState(false);
  async function resolve(id: string, action: string) {
    setBusy(true);
    setActionError('');
    try {
      await post(`/admin/reports/${id}`, { action });
      refresh();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Unable to resolve');
    } finally {
      setBusy(false);
    }
  }
  if (user?.role !== 'admin')
    return (
      <main className="page">
        <Notice error>Administrator access is required.</Notice>
      </main>
    );
  return (
    <main className="page">
      <PageHeader
        eyebrow="NETWORK OPERATIONS"
        title="Behind the"
        accent="connections."
        description="Review reports and background job status."
      />
      {loading && <div className="loading-line" />}
      {(error || actionError) && <Notice error>{error || actionError}</Notice>}
      {data && (
        <>
          <section className="detail-panel">
            <h2>Background work.</h2>
            <div className="button-row">
              {data.jobs.map((j) => (
                <span className="status" key={`${j.kind}-${j.status}`}>
                  {j.kind}: {j.status} · {j.count}
                </span>
              ))}
            </div>
            {!data.jobs.length && <p>No background work recorded yet.</p>}
          </section>
          <section className="detail-panel">
            <h2>Reported requests.</h2>
            {data.reports.length ? (
              data.reports.map((r) => (
                <article key={r.id} className="offer-card">
                  <div className="offer-heading">
                    <h3>{r.hospital}</h3>
                    <Status value={r.status} />
                  </div>
                  <p>{r.reason}</p>
                  <p className="help">
                    Reported by {r.name} · Concerning {r.target_name}
                  </p>
                  <Link className="inline-link" href={`/requests/${r.request_id}`}>
                    View request
                  </Link>
                  {r.status === 'open' && (
                    <div className="button-row list-actions">
                      <button
                        className="button outline small"
                        disabled={busy}
                        onClick={() => void resolve(r.id, 'dismiss')}
                      >
                        Dismiss report
                      </button>
                      <ConfirmButton
                        disabled={busy}
                        question="Cancel the reported request and end its arrangements?"
                        onConfirm={() => void resolve(r.id, 'remove')}
                      >
                        Cancel request
                      </ConfirmButton>
                      <ConfirmButton
                        disabled={busy}
                        question="Suspend this reported user and end their active participation?"
                        onConfirm={() => void resolve(r.id, 'suspend')}
                      >
                        Suspend reported user
                      </ConfirmButton>
                    </div>
                  )}
                </article>
              ))
            ) : (
              <Empty title="Nothing to review.">Reported requests will appear here.</Empty>
            )}
          </section>
        </>
      )}
    </main>
  );
}
