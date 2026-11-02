import Link from 'next/link';
import type { BloodRequest } from '@/lib/types';
import { date } from '@/lib/types';
import { Icon } from './icon';
import { Status } from './ui';

export function RequestCard({ request: r }: { request: BloodRequest }) {
  const status =
    new Date(r.deadline).getTime() <= Date.now() && ['open', 'covered'].includes(r.status)
      ? 'expired'
      : r.status;
  return (
    <article className="request-card">
      <div className="card-identity">
        <span className="blood-badge">{r.blood_group}</span>
        <Status value={status} />
      </div>
      <div className="card-destination">
        <span className="component">{r.component}</span>
        <h3>{r.hospital}</h3>
        <p className="card-meta">
          <Icon name="pin" size={13} />
          {r.city}
        </p>
      </div>
      <div className="card-time">
        <span className="eyebrow">NEEDED BY</span>
        <p className="card-meta">{date(r.deadline)}</p>
      </div>
      <div className="coverage">
        <div className="coverage-track">
          <span style={{ width: `${Math.min(100, (r.confirmed / r.target) * 100)}%` }} />
        </div>
        <span>
          {r.confirmed} / {r.target} arrangements confirmed
        </span>
      </div>
      <Link className="card-bottom" href={`/requests/${r.id}`}>
        <span>View request at {r.hospital}</span>
        <Icon name="diagonal" size={24} />
      </Link>
    </article>
  );
}
