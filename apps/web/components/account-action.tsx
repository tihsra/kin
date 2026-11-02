'use client';
import { SignupVerification } from './signup-verification';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { post } from '@/lib/api';
import { Notice } from './ui';
import { useAuth } from './providers';
import { AccountFrame } from './account-frame';

export function AccountAction({ mode }: { mode: 'verify' | 'reset' | 'forgot' }) {
  return mode === 'verify' ? <SignupVerification /> : <PasswordAction mode={mode} />;
}
function PasswordAction({ mode }: { mode: 'reset' | 'forgot' }) {
  const [token, setToken] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { reload } = useAuth();
  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get('token') || '');
  }, []);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const values = Object.fromEntries(new FormData(event.currentTarget));
      const result = await post(`/auth/${mode}`, { ...values, token });
      setMessage(result.message);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Please try again');
    } finally {
      setBusy(false);
    }
  }
  return (
    <AccountFrame
      eyebrow="YOUR KIN ACCOUNT"
      title={mode === 'reset' ? 'START' : 'FIND YOUR'}
      accent={mode === 'reset' ? 'FRESH.' : 'WAY BACK.'}
      intro="A few simple steps, then back to your people."
    >
      <span className="eyebrow">ACCOUNT ACCESS</span>
      <h2>{mode === 'reset' ? 'Reset your password.' : 'Forgot your password?'}</h2>
      <p>
        {mode === 'reset'
          ? 'Choose a new password with at least 10 characters.'
          : 'Enter your email and we’ll send you a reset link.'}
      </p>
      {message ? (
        <>
          <Notice>{message}</Notice>
          <Link className="button dark" href="/login">
            Back to sign in
          </Link>
        </>
      ) : (
        <form onSubmit={submit}>
          {mode === 'forgot' && (
            <label className="field">
              <span>Email address</span>
              <input name="email" type="email" autoComplete="email" required />
            </label>
          )}
          {mode === 'reset' && (
            <label className="field">
              <span>New password</span>
              <input
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={10}
                maxLength={128}
                required
              />
            </label>
          )}
          {error && <Notice error>{error}</Notice>}
          <button className="button dark" disabled={busy || (mode !== 'forgot' && !token)}>
            {busy ? 'One moment…' : mode === 'reset' ? 'Update password' : 'Send reset link'}
          </button>
          {mode !== 'forgot' && !token && (
            <Notice error>This link is missing its account token.</Notice>
          )}
        </form>
      )}
    </AccountFrame>
  );
}
