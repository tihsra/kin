'use client';
import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { Protected, Notice } from '@/components/ui';
import { useAuth } from '@/components/providers';
import { api } from '@/lib/api';
import { useRemote } from '@/lib/use-remote';
import { bloodGroups, type DonorProfile } from '@/lib/types';
import { LocationPicker, type Coordinates } from '@/components/location-picker';
import { Icon } from '@/components/icon';

export default function Settings() {
  return (
    <Protected>
      <SettingsForm />
    </Protected>
  );
}
function SettingsForm() {
  const { user, reload } = useAuth();
  const {
    data,
    loading,
    error: loadError,
  } = useRemote<DonorProfile>(user ? '/profile/donor' : null);
  const [location, setLocation] = useState<Coordinates>({ latitude: 0, longitude: 0 });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (data) setLocation({ latitude: data.latitude, longitude: data.longitude });
  }, [data]);
  async function saveProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    const v = Object.fromEntries(new FormData(e.currentTarget));
    try {
      await api('/profile', {
        method: 'PUT',
        body: JSON.stringify({ ...v, phone: v.phone || null }),
      });
      await reload();
      setMessage('Your personal details are saved.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to save');
    } finally {
      setBusy(false);
    }
  }
  async function saveDonor(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    const v = Object.fromEntries(new FormData(e.currentTarget));
    try {
      await api('/profile/donor', {
        method: 'PUT',
        body: JSON.stringify({
          ...v,
          ...location,
          radius_km: Number(v.radius_km),
          available: v.available === 'on',
          email_invitations: v.email_invitations === 'on',
          available_until: v.available_until
            ? new Date(String(v.available_until)).toISOString()
            : null,
        }),
      });
      setMessage(
        'Donor preferences saved. You can still offer on requests beyond your usual radius.',
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to save');
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="page">
      <PageHeader
        eyebrow="02 / YOUR TERMS. ALWAYS."
        title="Donor"
        accent="preferences."
        description="Change your preferences whenever life changes."
      />
      {message && <Notice>{message}</Notice>}
      {(error || loadError) && <Notice error>{error || loadError}</Notice>}
      <div className="form-shell">
        <div>
          <form onSubmit={saveProfile} className="form-section">
            <h2>Your details.</h2>
            <p>Your number stays private until you share it for a confirmed arrangement.</p>
            <label className="field">
              <span>Name</span>
              <input name="name" required minLength={2} maxLength={80} defaultValue={user?.name} />
            </label>
            <label className="field">
              <span>
                Phone number <small>(optional)</small>
              </span>
              <input
                name="phone"
                type="tel"
                maxLength={20}
                defaultValue={user?.phone || ''}
                placeholder="Include your country code"
              />
            </label>
            <button className="button dark small" disabled={busy}>
              Save personal details
            </button>
          </form>
          {loading ? (
            <div className="loading-line" />
          ) : (
            !loadError && (
              <form onSubmit={saveDonor} key={data ? 'existing' : 'new'} className="form-section">
                <h2>Your donor preferences.</h2>
                <p>
                  These guide invitations. They don’t decide how far you’re willing to travel on a
                  particular day.
                </p>
                <div className="form-grid">
                  <label className="field">
                    <span>Self-reported blood group</span>
                    <select name="blood_group" required defaultValue={data?.blood_group || ''}>
                      <option value="" disabled>
                        Select your group
                      </option>
                      {bloodGroups.map((g) => (
                        <option key={g}>{g}</option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>City</span>
                    <input
                      name="city"
                      required
                      minLength={2}
                      maxLength={80}
                      defaultValue={data?.city}
                    />
                  </label>
                </div>
                <LocationPicker value={location} onChange={setLocation} />
                <label className="field">
                  <span>Usual invitation radius (km)</span>
                  <input
                    name="radius_km"
                    type="number"
                    required
                    min={1}
                    max={500}
                    defaultValue={data?.radius_km || 15}
                  />
                  <small>Browse and offer beyond this radius whenever it works for you.</small>
                </label>
                <label className="check-field">
                  <input
                    name="available"
                    type="checkbox"
                    defaultChecked={data?.available ?? true}
                  />
                  <span>
                    I’m available for invitations. Pausing won’t cancel arrangements I already
                    confirmed.
                  </span>
                </label>
                <label className="field">
                  <span>
                    Available until <small>(optional, your local time)</small>
                  </span>
                  <input
                    name="available_until"
                    type="datetime-local"
                    defaultValue={
                      data?.available_until
                        ? new Date(
                            new Date(data.available_until).getTime() -
                              new Date(data.available_until).getTimezoneOffset() * 60000,
                          )
                            .toISOString()
                            .slice(0, 16)
                        : ''
                    }
                  />
                </label>
                <label className="check-field">
                  <input
                    name="email_invitations"
                    type="checkbox"
                    defaultChecked={data?.email_invitations ?? true}
                  />
                  <span>Also send request invitations by email.</span>
                </label>
                <button className="button dark" disabled={busy}>
                  {busy ? 'Saving…' : 'Save donor preferences'}
                  <Icon name="check" size={17} />
                </button>
              </form>
            )
          )}
        </div>
        <aside className="form-aside">
          <div className="aside-card">
            <Icon name="heart" size={28} />
            <h3>
              Some days, nearby.
              <br />
              Other days, farther.
            </h3>
            <p>
              Your usual radius helps us keep invitations relevant. Each request is a fresh choice
              about your time and travel.
            </p>
            <p className="aside-rule">
              Your blood group is self-reported. The collection centre confirms suitability before
              donation.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
