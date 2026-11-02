'use client';
import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import { use, useState } from 'react';
import { Protected, Notice, Status, ConfirmButton } from '@/components/ui';
import { RequestForm } from '@/components/request-form';
import { Icon } from '@/components/icon';
import { useRemote } from '@/lib/use-remote';
import { useAuth } from '@/components/providers';
import { api, post } from '@/lib/api';
import { date, type BloodRequest } from '@/lib/types';
import { useRouter } from 'next/navigation';

type Offer = {
  id: string;
  donor_id: string;
  name: string;
  note: string;
  status: string;
  arrival_start: string;
  arrival_end: string;
  commitment_id: string | null;
  commitment_status: string | null;
  shared_phone: string | null;
  i_shared: boolean | null;
};
type Details = {
  request: BloodRequest;
  isOwner: boolean;
  offers: Offer[];
  events: { description: string; created_at: string }[];
  outreach: { invited: number; responded: number } | null;
};
export default function RequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Protected>
      <RequestDetail id={id} />
    </Protected>
  );
}
function RequestDetail({ id }: { id: string }) {
  const { user } = useAuth();
  const router = useRouter();
  const {
    data,
    loading,
    error: loadError,
    refresh,
  } = useRemote<Details>(user ? `/requests/${id}` : null, true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [edit, setEdit] = useState(false);
  const [report, setReport] = useState(false);
  const [reportTarget, setReportTarget] = useState<string | undefined>();
  async function action(path: string, body: unknown = {}) {
    if (busy) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await post(path, body);
      setMessage(result.message || 'Request updated');
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Please try again');
    } finally {
      setBusy(false);
    }
  }
  async function saveInstructions(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api(`/requests/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ instructions: new FormData(e.currentTarget).get('instructions') }),
      });
      setMessage('Instructions updated');
      setEdit(false);
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to update');
    } finally {
      setBusy(false);
    }
  }
  async function discard() {
    setBusy(true);
    try {
      await api(`/requests/${id}`, { method: 'DELETE' });
      router.push('/dashboard');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to discard');
      setBusy(false);
    }
  }
  if (loading)
    return (
      <main className="page">
        <div className="loading-line" />
      </main>
    );
  if (!data)
    return (
      <main className="page">
        <PageHeader
          eyebrow="REQUEST DETAILS"
          title="A moment,"
          accent="please."
          description="We couldn’t load this request. Try again or return to the request board."
        />
        <Notice error>{loadError || 'Request not found'}</Notice>
        <button className="button outline small" onClick={refresh}>
          Try again
        </button>
      </main>
    );
  const r = data.request;
  const expired = new Date(r.deadline).getTime() <= Date.now();
  const active = ['open', 'covered'].includes(r.status) && !expired;
  const myOffer = data.offers.find((o) => o.donor_id === user?.id);
  if (edit && r.status === 'draft')
    return (
      <main className="page">
        <button className="back-link text-button" onClick={() => setEdit(false)}>
          ← Back to request
        </button>
        <PageHeader
          eyebrow="03 / YOUR DRAFT"
          title="Make it"
          accent="clear."
          description="Review the requirement and collection details before publishing."
        />
        <RequestForm initial={r} />
      </main>
    );
  return (
    <main className="page">
      <Link className="back-link" href={data.isOwner ? '/dashboard' : '/discover'}>
        ← {data.isOwner ? 'My dashboard' : 'All requests'}
      </Link>
      <PageHeader
        eyebrow={data.isOwner ? 'YOUR REQUEST' : '01 / A CHANCE TO HELP'}
        title={r.hospital}
        description={`${r.city} · Collection requirement provided by the requester`}
        status={
          <Status
            value={expired && ['open', 'covered'].includes(r.status) ? 'expired' : r.status}
          />
        }
      >
        {data.isOwner && active && (
          <ConfirmButton
            disabled={busy}
            question="Mark this request fulfilled? All current arrangements will close and outreach will stop."
            onConfirm={() => void action(`/requests/${id}/close`, { status: 'fulfilled' })}
          >
            Mark fulfilled
            <Icon name="check" size={16} />
          </ConfirmButton>
        )}
      </PageHeader>
      {(error || loadError) && <Notice error>{error || loadError}</Notice>}
      {message && <Notice>{message}</Notice>}
      {r.status === 'covered' && (
        <Notice>
          Enough donor arrangements are confirmed. This does not yet mean the hospital requirement
          is fulfilled.
        </Notice>
      )}
      {!active && r.status !== 'draft' && (
        <Notice>
          This request is closed or past its deadline. Please don’t travel based on an old
          invitation.
        </Notice>
      )}
      <div className="detail-grid">
        <div>
          <section className="detail-panel">
            <h2>The place and the plan.</h2>
            <dl className="detail-list">
              <div>
                <dt>Collection destination</dt>
                <dd>{r.destination}</dd>
              </div>
              <div>
                <dt>Needed by</dt>
                <dd>
                  {date(r.deadline)}
                  <br />
                  <small>Shown in your local timezone</small>
                </dd>
              </div>
              <div>
                <dt>Hospital requirement</dt>
                <dd>
                  {r.blood_group} · {r.component}
                  {r.quantity && (
                    <>
                      <br />
                      {r.quantity}
                    </>
                  )}
                </dd>
              </div>
              <div>
                <dt>Location</dt>
                <dd>
                  <a
                    className="inline-link"
                    href={`https://www.openstreetmap.org/?mlat=${r.latitude}&mlon=${r.longitude}#map=15/${r.latitude}/${r.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View collection location ↗
                  </a>
                </dd>
              </div>
            </dl>
          </section>
          <section className="detail-panel">
            <h2>Before you go.</h2>
            {edit ? (
              <form onSubmit={saveInstructions}>
                <label className="field">
                  <span>Collection instructions</span>
                  <textarea name="instructions" defaultValue={r.instructions} maxLength={2000} />
                </label>
                <div className="button-row">
                  <button className="button dark small" disabled={busy}>
                    Save changes
                  </button>
                  <button type="button" className="text-button" onClick={() => setEdit(false)}>
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <>
                <p className="preserved-text">
                  {r.instructions || 'No additional instructions have been added.'}
                </p>
                {data.isOwner && active && (
                  <button className="text-link text-button" onClick={() => setEdit(true)}>
                    Edit instructions
                  </button>
                )}
              </>
            )}
            <p className="help">
              The blood centre confirms clinical suitability and collection arrangements. Confirm
              the plan before travelling.
            </p>
          </section>
          {(data.isOwner || myOffer) && (
            <section className="detail-panel">
              <h2>{data.isOwner ? 'People who offered.' : 'Your offer.'}</h2>
              {!data.offers.length && (
                <p>No offers yet. We’ll show responses here as donors reply.</p>
              )}
              {data.offers.map((o) => (
                <article className="offer-card" key={o.id}>
                  <div className="offer-heading">
                    <h3>{data.isOwner ? o.name : 'Your arrangement'}</h3>
                    <Status value={o.commitment_status || o.status} />
                  </div>
                  <p>
                    <Icon name="clock" size={13} /> {date(o.arrival_start)} – {date(o.arrival_end)}
                  </p>
                  {o.note && <p>{o.note}</p>}
                  {o.shared_phone && (
                    <div className="contact-number">
                      Shared with you: <a href={`tel:${o.shared_phone}`}>{o.shared_phone}</a>
                    </div>
                  )}
                  <div className="button-row">
                    {data.isOwner && (
                      <button
                        className="text-button"
                        onClick={() => {
                          setReportTarget(o.donor_id);
                          setReport(true);
                        }}
                      >
                        Report participant
                      </button>
                    )}
                    {o.status === 'pending' && active && (
                      <>
                        {data.isOwner ? (
                          <>
                            <ConfirmButton
                              disabled={busy || r.status !== 'open'}
                              question="Confirm this donor’s arrival window? This creates an active arrangement."
                              onConfirm={() =>
                                void action(`/requests/${id}/offers/${o.id}/confirm`)
                              }
                            >
                              Confirm donor
                            </ConfirmButton>
                            <button
                              className="text-button"
                              disabled={busy}
                              onClick={() =>
                                void action(`/requests/${id}/offers/${o.id}/withdraw`, {
                                  action: 'reject',
                                })
                              }
                            >
                              Decline offer
                            </button>
                          </>
                        ) : (
                          <button
                            className="button outline small"
                            disabled={busy}
                            onClick={() => void action(`/requests/${id}/offers/${o.id}/withdraw`)}
                          >
                            Withdraw offer
                          </button>
                        )}
                      </>
                    )}
                    {o.commitment_status === 'confirmed' && active && (
                      <>
                        {!o.i_shared ? (
                          <ConfirmButton
                            disabled={busy}
                            question="Share your saved phone number with this participant? They may retain it after the arrangement ends."
                            onConfirm={() => void action(`/commitments/${o.commitment_id}/share`)}
                          >
                            Share my number
                          </ConfirmButton>
                        ) : (
                          <span className="help">Your number is shared with this participant.</span>
                        )}
                        <ConfirmButton
                          disabled={busy}
                          question="Cancel this arrangement? The other participant will be notified."
                          onConfirm={() => void action(`/commitments/${o.commitment_id}/cancel`)}
                        >
                          Cancel arrangement
                        </ConfirmButton>
                      </>
                    )}
                  </div>
                </article>
              ))}
            </section>
          )}
          <section className="detail-panel">
            <h2>Along the way.</h2>
            <ul className="timeline">
              {data.events.map((e, i) => (
                <li key={`${e.created_at}-${i}`}>
                  <span>{e.description}</span>
                  <time>{date(e.created_at)}</time>
                </li>
              ))}
            </ul>
            {!data.events.length && <p>Updates will appear after publication.</p>}
          </section>
        </div>
        <aside>
          <div className="request-summary">
            <span className="eyebrow">{r.component.toUpperCase()}</span>
            <span className="blood-badge">{r.blood_group}</span>
            <h3>
              {r.confirmed} of {r.target}
              <br />
              arrangements confirmed.
            </h3>
            <div className="coverage">
              <div className="coverage-track">
                <span style={{ width: `${Math.min(100, (r.confirmed / r.target) * 100)}%` }} />
              </div>
            </div>
            <p>
              Each confirmed arrangement is a person’s commitment, not a confirmed quantity of
              blood.
            </p>
            {data.isOwner ? (
              <>
                {r.status === 'draft' ? (
                  <>
                    <button
                      className="button dark"
                      disabled={busy || !r.checked_instructions}
                      onClick={() => void action(`/requests/${id}/publish`)}
                    >
                      Publish request <Icon name="diagonal" size={17} />
                    </button>
                    <button className="button outline" onClick={() => setEdit(true)}>
                      Edit draft
                    </button>
                    <ConfirmButton
                      disabled={busy}
                      question="Permanently discard this unpublished draft?"
                      onConfirm={() => void discard()}
                    >
                      Discard draft
                    </ConfirmButton>
                  </>
                ) : (
                  active && (
                    <>
                      <p>
                        {data.outreach?.invited || 0} invited · {data.outreach?.responded || 0}{' '}
                        responded
                      </p>
                      {r.outreach_exhausted && (
                        <Notice>
                          No more matching donors in the current outreach range. You can retry as
                          availability changes.
                        </Notice>
                      )}
                      {r.status === 'open' && (
                        <button
                          className="button outline"
                          disabled={busy}
                          onClick={() => void action(`/requests/${id}/retry`)}
                        >
                          Retry outreach
                        </button>
                      )}
                      <ConfirmButton
                        disabled={busy}
                        question="Cancel this request and end all arrangements?"
                        onConfirm={() =>
                          void action(`/requests/${id}/close`, { status: 'cancelled' })
                        }
                      >
                        Cancel request
                      </ConfirmButton>
                    </>
                  )
                )}
              </>
            ) : !myOffer && r.status === 'open' && !expired ? (
              <OfferForm id={id} deadline={r.deadline} onSuccess={refresh} />
            ) : (
              myOffer?.status === 'pending' && (
                <p>Wait for the requester to confirm before travelling.</p>
              )
            )}
          </div>
          {r.status !== 'draft' && (
            <div className="detail-panel">
              {report ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void action(`/requests/${id}/report`, {
                      reason: new FormData(e.currentTarget).get('reason'),
                      target_id: reportTarget,
                    }).then(() => setReport(false));
                  }}
                >
                  <label className="field">
                    <span>What should we review?</span>
                    <textarea name="reason" required minLength={10} maxLength={1000} />
                  </label>
                  <button className="button outline small" disabled={busy}>
                    Submit report
                  </button>
                </form>
              ) : (
                !data.isOwner && (
                  <button
                    className="text-button"
                    onClick={() => {
                      setReportTarget(undefined);
                      setReport(true);
                    }}
                  >
                    Report this request
                  </button>
                )
              )}
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}
function OfferForm({
  id,
  deadline,
  onSuccess,
}: {
  id: string;
  deadline: string;
  onSuccess: () => void;
}) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const v = Object.fromEntries(new FormData(e.currentTarget));
    try {
      await post(`/requests/${id}/offers`, {
        ...v,
        arrival_start: new Date(String(v.arrival_start)).toISOString(),
        arrival_end: new Date(String(v.arrival_end)).toISOString(),
      });
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to offer');
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="offer-form">
      <h3>Does it fit your day?</h3>
      <p className="help">
        Choose an arrival window before {date(deadline)}. A farther trip is always your choice.
      </p>
      <label className="field">
        <span>Earliest arrival</span>
        <input name="arrival_start" type="datetime-local" required />
      </label>
      <label className="field">
        <span>Latest arrival</span>
        <input name="arrival_end" type="datetime-local" required />
      </label>
      <label className="field">
        <span>
          A short note <small>(optional)</small>
        </span>
        <textarea
          name="note"
          maxLength={400}
          placeholder="Practical details only. Don’t include your phone number."
        />
      </label>
      {error && <Notice error>{error}</Notice>}
      <button className="button dark" disabled={busy}>
        {busy ? 'Sending…' : 'Offer to help'}
        <Icon name="heart" size={17} />
      </button>
      <p className="help">
        <Link className="inline-link" href="/settings">
          Set up your donor profile
        </Link>{' '}
        before offering. Wait for confirmation before travelling.
      </p>
    </form>
  );
}
