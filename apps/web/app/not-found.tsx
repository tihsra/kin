import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import { Icon } from '@/components/icon';

export default function NotFound() {
  return (
    <main className="page narrow">
      <PageHeader
        eyebrow="404 / WRONG TURN"
        title="Off the"
        accent="map."
        description="This page isn’t here, but your people are. Let’s find a better way back."
      />
      <div className="button-row">
        <Link className="button dark" href="/">
          Back to Kin
          <Icon name="arrow" size={18} />
        </Link>
        <Link className="button outline" href="/discover">
          Find a request
        </Link>
      </div>
    </main>
  );
}
