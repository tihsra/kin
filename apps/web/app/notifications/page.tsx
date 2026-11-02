'use client';
import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import { useState } from 'react';
import { Protected, Notice, Empty } from '@/components/ui';
import { useAuth } from '@/components/providers';
import { useRemote } from '@/lib/use-remote';
import { post } from '@/lib/api';
import { date } from '@/lib/types';
import { Icon } from '@/components/icon';

type Notification = {
  id: string;
  request_id: string | null;
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
};
export default function Notifications() {
  return (
    <Protected>
      <Inbox />
    </Protected>
  );
}
function Inbox() {
  const { user } = useAuth();
  const { data, loading, error, refresh } = useRemote<Notification[]>(
    user ? '/notifications' : null,
    true,
  );
  const [actionError, setActionError] = useState('');
  async function read(id: string) {
    try {
      await post(`/notifications/${id}/read`);
      refresh();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Unable to update');
    }
  }
  return (
    <main className="page">
      <PageHeader
        eyebrow="UPDATES FROM THE NETWORK"
        title="From the"
        accent="network."
        description="Invitations, arrangements, and changes worth knowing about."
      />
      {loading && <div className="loading-line" />}
      {(error || actionError) && <Notice error>{error || actionError}</Notice>}
      {data &&
        (data.length ? (
          data.map((n) => (
            <article key={n.id} className={`notification${!n.read_at ? ' unread' : ''}`}>
              <div className="notification-icon">
                <Icon name="bell" />
              </div>
              <div>
                <time>{date(n.created_at)}</time>
                <h3>{n.title}</h3>
                <p>{n.body}</p>
                <div className="notification-actions">
                  {n.request_id && (
                    <Link className="text-link" href={`/requests/${n.request_id}`}>
                      View request <Icon name="diagonal" size={14} />
                    </Link>
                  )}
                  {!n.read_at && (
                    <button className="text-button" onClick={() => void read(n.id)}>
                      Mark as read
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))
        ) : (
          <Empty title="You’re all caught up.">
            New invitations and arrangement updates will appear here.
          </Empty>
        ))}
    </main>
  );
}
