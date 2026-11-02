'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, post } from '@/lib/api';
import { bloodGroups, components, date, type BloodRequest } from '@/lib/types';
import { Notice } from './ui';
import { Icon } from './icon';
import { LocationPicker, type Coordinates } from './location-picker';

export function RequestForm({ initial }: { initial?: BloodRequest }) {
  const router = useRouter();
  const [location, setLocation] = useState<Coordinates>({
    latitude: initial?.latitude || 0,
    longitude: initial?.longitude || 0,
  });
  const [draft, setDraft] = useState<Record<string, any> | null>(null);
  const defaults = draft || initial;
  const [locationSelected, setLocationSelected] = useState(!!initial);
  const [review, setReview] = useState<Record<string, any> | null>(null);
  const [savedId, setSavedId] = useState(initial?.id || '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  function reviewRequest(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(e.currentTarget));
    if (!locationSelected) {
      setError('Choose the collection location on the map or enter its coordinates.');
      return;
    }
    if (new Date(String(v.deadline)).getTime() <= Date.now()) {
      setError('Choose a deadline in the future');
      return;
    }
    const values = {
      ...v,
      ...location,
      target: Number(v.target),
      deadline: new Date(String(v.deadline)).toISOString(),
      checked_instructions: v.checked_instructions === 'on',
      quantity: v.quantity || null,
    };
    setError('');
    setReview(values);
    setDraft(values);
    window.scrollTo({ top: 80, behavior: 'smooth' });
  }
  async function save(publish: boolean) {
    if (!review || busy) return;
    setBusy(true);
    setError('');
    try {
      const saved = savedId
        ? await api<BloodRequest>(`/requests/${savedId}`, {
            method: 'PATCH',
            body: JSON.stringify(review),
          })
        : await post<BloodRequest>('/requests', review);
      setSavedId(saved.id);
      if (publish) await post(`/requests/${saved.id}/publish`);
      router.push(`/requests/${saved.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to save request');
    } finally {
      setBusy(false);
    }
  }
  const localDeadline = defaults
    ? new Date(
        new Date(defaults.deadline).getTime() -
          new Date(defaults.deadline).getTimezoneOffset() * 60000,
      )
        .toISOString()
        .slice(0, 16)
    : '';
  return (
    <div className="form-shell">
      <div>
        {error && <Notice error>{error}</Notice>}
        {review ? (
          <>
            <div className="review">
              <span className="eyebrow">ONE LAST LOOK</span>
              <h3>{review.hospital}</h3>
              <dl>
                {[
                  ['Requirement', `${review.blood_group} · ${review.component}`],
                  ['Collection destination', review.destination],
                  ['City', review.city],
                  ['Coordinates', `${review.latitude}, ${review.longitude}`],
                  ['Needed by', date(review.deadline)],
                  ['Donor arrangements sought', review.target],
                  ['Instructions', review.instructions || 'None added'],
                ].map(([label, value]) => (
                  <div className="review-entry" key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
              <p className="help">
                Confirm the collection location before publishing. Published requirements, location,
                and deadline cannot be edited.
              </p>
            </div>
            <div className="button-row">
              <button
                className="button dark"
                disabled={busy || !review.checked_instructions}
                onClick={() => void save(true)}
              >
                {busy ? 'Saving…' : 'Publish request'}
                <Icon name="diagonal" size={17} />
              </button>
              <button className="button outline" disabled={busy} onClick={() => void save(false)}>
                Save as draft
              </button>
              <button className="text-button" disabled={busy} onClick={() => setReview(null)}>
                Back to edit
              </button>
            </div>
            {!review.checked_instructions && (
              <Notice>
                Confirm you checked the collection instructions before publishing. You can still
                save a draft.
              </Notice>
            )}
          </>
        ) : (
          <form onSubmit={reviewRequest}>
            <section className="form-section">
              <span className="eyebrow">01 / THE REQUIREMENT</span>
              <h2>What has the hospital asked for?</h2>
              <p>Use the requirement provided by the hospital or blood centre.</p>
              <label className="field">
                <span>Hospital name</span>
                <input
                  name="hospital"
                  required
                  minLength={2}
                  maxLength={160}
                  defaultValue={defaults?.hospital}
                  placeholder="Hospital or treating facility"
                />
              </label>
              <div className="form-grid">
                <label className="field">
                  <span>Blood group</span>
                  <select name="blood_group" required defaultValue={defaults?.blood_group || ''}>
                    <option value="" disabled>
                      Select a group
                    </option>
                    {bloodGroups.map((g) => (
                      <option key={g}>{g}</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Component requested</span>
                  <select name="component" defaultValue={defaults?.component || components[0]}>
                    {components.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Donor arrangements sought</span>
                  <input
                    name="target"
                    type="number"
                    required
                    min={1}
                    max={20}
                    defaultValue={defaults?.target || 1}
                  />
                  <small>This counts people, not blood units.</small>
                </label>
                <label className="field">
                  <span>
                    Hospital quantity <small>(optional)</small>
                  </span>
                  <input
                    name="quantity"
                    maxLength={80}
                    defaultValue={defaults?.quantity || ''}
                    placeholder="As stated by the hospital"
                  />
                </label>
              </div>
            </section>
            <section className="form-section">
              <span className="eyebrow">02 / THE PLACE & TIME</span>
              <h2>Where should a donor go?</h2>
              <p>The collection destination may differ from the patient’s hospital.</p>
              <label className="field">
                <span>Collection centre and address</span>
                <input
                  name="destination"
                  required
                  minLength={4}
                  maxLength={240}
                  defaultValue={defaults?.destination}
                  placeholder="Centre, building, street"
                />
              </label>
              <label className="field">
                <span>City</span>
                <input
                  name="city"
                  required
                  minLength={2}
                  maxLength={80}
                  defaultValue={defaults?.city}
                  placeholder="Collection city"
                />
              </label>
              <LocationPicker
                value={location}
                onChange={(v) => {
                  setLocation(v);
                  setLocationSelected(true);
                }}
              />
              <label className="field">
                <span>
                  Needed by <small>(your local time)</small>
                </span>
                <input
                  name="deadline"
                  type="datetime-local"
                  required
                  defaultValue={localDeadline}
                />
              </label>
            </section>
            <section className="form-section">
              <span className="eyebrow">03 / THE PRACTICAL DETAILS</span>
              <h2>Make showing up simpler.</h2>
              <label className="field">
                <span>Collection instructions</span>
                <textarea
                  name="instructions"
                  maxLength={2000}
                  defaultValue={defaults?.instructions}
                  placeholder="Collection hours, entrance, meeting point. Leave out patient details and phone numbers."
                />
              </label>
              <label className="check-field">
                <input
                  name="checked_instructions"
                  type="checkbox"
                  defaultChecked={defaults?.checked_instructions}
                />
                <span>
                  I checked the collection destination and instructions with the hospital or blood
                  centre.
                </span>
              </label>
            </section>
            <button className="button dark">
              Review request <Icon name="arrow" />
            </button>
          </form>
        )}
      </div>
      <aside className="form-aside">
        <div className="aside-card">
          <Icon name="shield" size={28} />
          <h3>
            A little clarity
            <br />
            makes a difference.
          </h3>
          <p>
            Give donors a destination and a realistic time window. They decide whether they can make
            the trip.
          </p>
          <p className="aside-rule">
            Offers aren’t confirmed arrangements. Confirm a donor before asking them to travel.
          </p>
          <p className="aside-rule">
            Keep patient names, medical documents, and contact numbers out of public instructions.
          </p>
        </div>
      </aside>
    </div>
  );
}
