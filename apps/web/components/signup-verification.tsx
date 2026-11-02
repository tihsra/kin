'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { post, setCsrf } from '@/lib/api';
import { clearSignup, readSignup, rememberSignup, type SignupChallenge } from '@/lib/signup';
import { useAuth } from './providers';
import { AccountFrame } from './account-frame';
import { Notice } from './ui';

export function SignupVerification() {
  const router = useRouter();
  const { reload } = useAuth();
  const [challenge, setChallenge] = useState<SignupChallenge | null>(null);
  const [ready, setReady] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    setChallenge(readSignup());
    setReady(true);
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const wait = challenge
    ? Math.max(0, Math.ceil((Date.parse(challenge.resendAt) - now) / 1000))
    : 0;
  const expired = !!challenge && Date.parse(challenge.expiresAt) <= now;
  async function verify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!challenge) return;
    setBusy(true);
    setError('');
    try {
      const result = await post<{ csrf: string }>('/auth/verify', {
        challengeId: challenge.challengeId,
        code,
      });
      setCsrf(result.csrf);
      clearSignup();
      await reload();
      router.replace('/dashboard');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Please try again');
    } finally {
      setBusy(false);
    }
  }
  async function resend() {
    if (!challenge) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await post<Omit<SignupChallenge, 'email'>>('/auth/resend-otp', {
        challengeId: challenge.challengeId,
      });
      const next = { ...challenge, ...result };
      rememberSignup(next);
      setChallenge(next);
      setCode('');
      setNow(Date.now());
      setMessage('A new code has been requested. Use the most recent email.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Please try again');
    } finally {
      setBusy(false);
    }
  }
  return (
    <AccountFrame
      eyebrow="YOUR KIN ACCOUNT"
      title="MAKE IT"
      accent="OFFICIAL."
      intro="A few simple steps, then back to your people."
    >
      <span className="eyebrow">VERIFY YOUR EMAIL</span>
      <h2>Check your inbox.</h2>
      {!ready ? (
        <p>Loading…</p>
      ) : challenge ? (
        <>
          <p>
            Enter the six-digit code sent to {challenge.email}. Your account opens after
            verification.
          </p>
          <form onSubmit={verify}>
            <label className="field">
              <span>Verification code</span>
              <input
                name="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                minLength={6}
                maxLength={6}
                required
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                autoFocus
              />
            </label>
            {expired && <Notice error>This code has expired. Request a new one below.</Notice>}
            {error && <Notice error>{error}</Notice>}
            {message && <Notice>{message}</Notice>}
            <button className="button dark" disabled={busy || expired}>
              {busy ? 'One moment…' : 'Verify and continue'}
            </button>
            <button
              className="text-button"
              type="button"
              onClick={resend}
              disabled={busy || wait > 0}
            >
              {wait ? `Resend in ${wait}s` : 'Resend code'}
            </button>
          </form>
          <p className="help">Codes expire in 10 minutes. Check your spam folder too.</p>
          <Link className="inline-link" href="/register">
            Use a different email
          </Link>
        </>
      ) : (
        <>
          <p>Start signup to receive your verification code.</p>
          <Link className="button dark" href="/register">
            Create an account
          </Link>
        </>
      )}
    </AccountFrame>
  );
}
