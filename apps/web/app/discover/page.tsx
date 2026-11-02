'use client';
import { useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { Protected, Notice, Empty } from '@/components/ui';
import { RequestCard } from '@/components/request-card';
import { Icon } from '@/components/icon';
import { useRemote } from '@/lib/use-remote';
import { useAuth } from '@/components/providers';
import { bloodGroups, components, type BloodRequest } from '@/lib/types';

export default function Discover() {
  return (
    <Protected>
      <Discovery />
    </Protected>
  );
}
function Discovery() {
  const { user } = useAuth();
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [geoError, setGeoError] = useState('');
  const { data, loading, error, refresh } = useRemote<{ items: BloodRequest[]; total: number }>(
    user ? `/requests?scope=discover&page=${page}${filter}` : null,
    true,
  );
  function apply(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const values = new FormData(e.currentTarget);
    const params = new URLSearchParams();
    for (const key of ['blood_group', 'component'])
      if (values.get(key)) params.set(key, String(values.get(key)));
    if (location) {
      params.set('latitude', String(location.latitude));
      params.set('longitude', String(location.longitude));
      params.set('radius', String(values.get('radius') || 30));
    }
    setFilter(`&${params}`);
    setPage(1);
  }
  function locate() {
    if (!navigator.geolocation) {
      setGeoError('Location is unavailable. You can still browse all requests.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLocation({ latitude: p.coords.latitude, longitude: p.coords.longitude });
        setGeoError('');
      },
      () => setGeoError('Location permission wasn’t available. You can still browse all requests.'),
      { timeout: 10000 },
    );
  }
  return (
    <main className="page">
      <PageHeader
        eyebrow="01 / FIND YOUR PEOPLE"
        title="The request"
        accent="board."
        description="Look for a location and time that work for you. Your usual radius is only a preference."
      >
        <button className="button outline small" onClick={locate}>
          <Icon name="pin" size={16} />
          {location ? 'Location selected' : 'Use my location'}
        </button>
      </PageHeader>
      {geoError && <Notice>{geoError}</Notice>}
      <form className="filters" onSubmit={apply}>
        <label className="field">
          <span>Blood group</span>
          <select name="blood_group">
            <option value="">All groups</option>
            {bloodGroups.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Component</span>
          <select name="component">
            <option value="">All components</option>
            {components.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Search radius</span>
          <select name="radius" disabled={!location}>
            <option value="30">Within 30 km</option>
            <option value="100">Within 100 km</option>
            <option value="500">Within 500 km</option>
            <option value="1000">Within 1,000 km</option>
          </select>
        </label>
        <button className="button dark">
          Apply filters <Icon name="arrow" size={17} />
        </button>
      </form>
      {loading && <div className="loading-line" />}
      {error && (
        <>
          <Notice error>{error}</Notice>
          <button className="button outline small" onClick={refresh}>
            Try again
          </button>
        </>
      )}
      {data && (
        <>
          <p className="result-count">
            {data.total} OPEN {data.total === 1 ? 'REQUEST' : 'REQUESTS'} · COLLECTION CENTRE
            CONFIRMS SUITABILITY
          </p>
          {data.items.length ? (
            <div className="request-grid">
              {data.items.map((r) => (
                <RequestCard key={r.id} request={r} />
              ))}
            </div>
          ) : (
            <Empty title="A little quiet here.">
              No open requests match these filters. Try widening your search or come back later.
            </Empty>
          )}
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
              disabled={page * 12 >= data.total}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </>
      )}
    </main>
  );
}
