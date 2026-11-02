'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { rememberSignup, type SignupChallenge } from '@/lib/signup';
import { post, setCsrf } from '@/lib/api';
import { useAuth } from './providers';
import { Notice } from './ui';
import { Icon } from './icon';
import { AccountFrame } from './account-frame';

export function AuthForm({ register = false }: { register?: boolean }) {
  const router = useRouter();
  const { reload } = useAuth();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const result = await post<SignupChallenge & { csrf: string; verificationRequired?: boolean }>(
        register ? '/auth/register' : '/auth/login',
        data,
      );
      if (register || result.verificationRequired) {
        rememberSignup({ ...result, email: String(data.email).trim().toLowerCase() });
        router.push('/account/verify');
      } else {
        setCsrf(result.csrf);
        await reload();
        router.push('/dashboard');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Please try again');
    } finally {
      setBusy(false);
    }
  }
  return (
    <AccountFrame
      eyebrow={register ? '02 / JOIN THE NETWORK' : 'YOUR KIN ACCOUNT'}
      title={register ? 'SHOW UP.' : 'YOUR'}
      accent={register ? 'BE KIN.' : 'PEOPLE.'}
      intro="A donor. A requester. A person who can make the trip. There’s room for you here."
    >
      <span className="eyebrow">WELCOME TO KIN</span>
      <h2>{register ? 'Join the network.' : 'Welcome back.'}</h2>
      <p>
        {register
          ? 'One account to offer help or find it. Verify your email with a six-digit code to get started.'
          : 'Sign in to your requests and arrangements.'}
      </p>
      <form onSubmit={submit}>
        {register && (
          <label className="field">
            <span>Your name</span>
            <input
              name="name"
              autoComplete="name"
              required
              minLength={2}
              maxLength={80}
              placeholder="What should we call you?"
            />
          </label>
        )}
        <label className="field">
          <span>Email address</span>
          <input
            type="email"
            name="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
          />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            type="password"
            name="password"
            autoComplete={register ? 'new-password' : 'current-password'}
            required
            minLength={register ? 10 : 1}
            maxLength={128}
            placeholder={register ? 'At least 10 characters' : 'Your password'}
          />
        </label>
        {!register && (
          <p>
            <Link className="inline-link" href="/account/forgot">
              Forgot your password?
            </Link>
          </p>
        )}
        {error && <Notice error>{error}</Notice>}
        <button className="button dark" disabled={busy}>
          {busy ? 'One moment…' : register ? 'Create an account' : 'Sign in'}
          <Icon name="arrow" />
        </button>
      </form>
      <div className="auth-foot">
        {register ? 'Already part of Kin? ' : 'New around here? '}
        <Link href={register ? '/login' : '/register'}>
          {register ? 'Sign in' : 'Create an account'}
        </Link>
      </div>
      <p className="help form-privacy-note">
        Your phone number is never part of a public directory.
      </p>
    </AccountFrame>
  );
}
