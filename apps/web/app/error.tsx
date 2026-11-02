'use client';

import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import { Icon } from '@/components/icon';

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="page narrow">
      <PageHeader
        eyebrow="A PAUSE IN THE CONNECTION"
        title="Let’s try"
        accent="again."
        description="Something interrupted this page. Please try once more, or head back to the network."
      />
      <div className="button-row">
        <button className="button dark" onClick={reset}>
          Try again
          <Icon name="arrow" size={18} />
        </button>
        <Link className="button outline" href="/dashboard">
          Your dashboard
        </Link>
      </div>
    </main>
  );
}
