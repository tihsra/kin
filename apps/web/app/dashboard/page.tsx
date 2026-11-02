'use client';
import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import { useState } from 'react';
import { Protected, Empty, Notice, Status } from '@/components/ui';
import { RequestCard } from '@/components/request-card';
import { Icon } from '@/components/icon';
import { useAuth } from '@/components/providers';
import { useRemote } from '@/lib/use-remote';
import { post } from '@/lib/api';
import { date, type BloodRequest } from '@/lib/types';

type Participation = {
  id: string;
  status: string;
  request_id: string;
  hospital: string;
  city: string;
  blood_group: string;
  arrival_start: string;
  commitment_status: string | null;
  request_status: string;
};
type Invitation = {
  id: string;
  request_id: string;
  hospital: string;
  blood_group: string;
  city: string;
  status: string;
  request_status: string;
  expires_at: string;
};
export default function Dashboard() {
  return (
    <Protected>
      <DashboardContent />
    </Protected>
  );
}
function DashboardContent() {
  const { user } = useAuth();
  const [tab, setTab] = useState('requests');
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const mine = useRemote<{ items: BloodRequest[]; total: number }>(
    user ? `/requests?scope=mine&page=${page}` : null,
    true,
  );
  const participation = useRemote<Participation[]>(user ? '/participation' : null, true);
  const invitations = useRemote<Invitation[]>(user ? '/invitations' : null, true);
  async function decline(id: string) {
    try {
      await post(`/invitations/${id}/decline`);
      invitations.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to decline');
    }
  }
  return (
    <main className="page">
      <PageHeader
        eyebrow="YOUR CONNECTIONS"
        title="Your network,"
        accent={`${user?.name.split(' ')[0] || 'your people'}.`}
        description="Requests, responses, and arrangements. All in one place."
      >
        <Link className="button dark" href="/requests/new">
          New request
          <Icon name="plus" size={17} />
        </Link>
      </PageHeader>
      <div className="stat-grid">
        <div className="stat">
          <strong>{mine.data?.total ?? '—'}</strong>
          <span>Requests you’ve created</span>
        </div>
        <div className="stat">
          <strong>
            {participation.data?.filter((p) => p.commitment_status === 'confirmed').length ?? '—'}
          </strong>
          <span>Active donor arrangements</span>
        </div>
        <div className="stat">
          <strong>
            {invitations.data?.filter(
              (i) =>
                i.status === 'pending' &&
                i.request_status === 'open' &&
                new Date(i.expires_at).getTime() > Date.now(),
            ).length ?? '—'}
          </strong>
          <span>Invitations to consider</span>
        </div>
      </div>
      <div className="tabs" role="tablist" aria-label="Dashboard sections">
        {[
          ['requests', 'My requests'],
          ['offers', 'My offers & arrangements'],
          ['invitations', 'Invitations'],
        ].map(([key, label]) => (
          <button
            role="tab"
            aria-selected={tab === key}
            className={`tab${tab === key ? ' active' : ''}`}
            key={key}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>
      {(error || mine.error || participation.error || invitations.error) && (
        <Notice error>{error || mine.error || participation.error || invitations.error}</Notice>
      )}
      {tab === 'requests' && (
        <>
          {mine.loading && <div className="loading-line" />}
          {mine.data &&
            (mine.data.items.length ? (
              <>
                <div className="request-grid">
                  {mine.data.items.map((r) => (
                    <RequestCard key={r.id} request={r} />
                  ))}
                </div>
                <div className="pagination">
                  <button
                    className="button outline small"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </button>
                  <span>Page {page}</span>
                  <button
                    className="button outline small"
                    disabled={page * 12 >= mine.data.total}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </button>
                </div>
              </>
            ) : (
              <Empty title="Your first request starts here.">
                Create a request when you have the collection location and hospital instructions
                ready.
              </Empty>
            ))}
        </>
      )}
      {tab === 'offers' && (
        <>
          {participation.loading && <div className="loading-line" />}
          {participation.data &&
            (participation.data.length ? (
              participation.data.map((p) => (
                <article className="offer-card" key={p.id}>
                  <div className="offer-heading">
                    <h3>{p.hospital}</h3>
                    <Status value={p.commitment_status || p.status} />
                  </div>
                  <p>
                    {p.blood_group} · {p.city} · Arrival from {date(p.arrival_start)}
                  </p>
                  <Link className="text-link" href={`/requests/${p.request_id}`}>
                    View arrangement <Icon name="diagonal" size={15} />
                  </Link>
                </article>
              ))
            ) : (
              <Empty title="A little help starts with an offer.">
                Find a request that fits your day. Confirmed arrangements will appear here.
              </Empty>
            ))}
        </>
      )}
      {tab === 'invitations' && (
        <>
          {invitations.loading && <div className="loading-line" />}
          {invitations.data &&
            (invitations.data.length ? (
              invitations.data.map((i) => (
                <article className="offer-card" key={i.id}>
                  <div className="offer-heading">
                    <h3>{i.hospital}</h3>
                    <Status
                      value={
                        new Date(i.expires_at).getTime() <= Date.now() && i.status === 'pending'
                          ? 'expired'
                          : i.status
                      }
                    />
                  </div>
                  <p>
                    {i.blood_group} · {i.city} · Review location and timing before offering.
                  </p>
                  <div className="button-row">
                    <Link className="text-link" href={`/requests/${i.request_id}`}>
                      View request <Icon name="diagonal" size={15} />
                    </Link>
                    {i.status === 'pending' && new Date(i.expires_at).getTime() > Date.now() && (
                      <button className="text-button" onClick={() => void decline(i.id)}>
                        Not this time
                      </button>
                    )}
                  </div>
                </article>
              ))
            ) : (
              <Empty title="No invitations just yet.">
                Set up your donor preferences to receive relevant invitations. You can also browse
                requests yourself.
              </Empty>
            ))}
        </>
      )}
      <p className="help dashboard-footnote">
        <Link className="inline-link" href="/settings">
          Update your donor preferences
        </Link>
        {user?.role === 'admin' && (
          <>
            {' '}
            ·{' '}
            <Link className="inline-link" href="/admin">
              Administration
            </Link>
          </>
        )}
      </p>
    </main>
  );
}
