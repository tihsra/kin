'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from './providers';
import { Icon } from './icon';
import { Brand } from './brand';
import { post, setCsrf } from '@/lib/api';

export function Header() {
  const { user, reload } = useAuth();
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [open]);

  async function logout() {
    try {
      await post('/auth/logout');
      setCsrf(null);
      await reload();
      router.push('/');
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to sign out');
    }
  }

  const isCurrent = (number: string) => {
    if (number === '01')
      return path === '/discover' || (path.startsWith('/requests/') && path !== '/requests/new');
    if (number === '02') return path === '/settings' || path === '/register';
    return path === '/requests/new';
  };

  const chapters = [
    { number: '01', label: 'Find your people', href: '/discover' },
    { number: '02', label: 'Be a donor', href: user ? '/settings' : '/register' },
    { number: '03', label: 'Request help', href: '/requests/new' },
  ];

  return (
    <>
      <header className="site-header">
        <Brand />
        <button
          className="menu-toggle"
          aria-label={open ? 'Close navigation' : 'Open navigation'}
          aria-expanded={open}
          aria-controls="chapter-navigation"
          onClick={() => setOpen(!open)}
        >
          {open ? 'Close' : 'Explore'} <Icon name={open ? 'close' : 'menu'} size={21} />
        </button>
        <nav
          id="chapter-navigation"
          className={`chapter-navigation${open ? ' is-open' : ''}`}
          aria-label="Main navigation"
        >
          {chapters.map((item) => (
            <Link
              key={item.number}
              className={`chapter-link${isCurrent(item.number) ? ' is-current' : ''}`}
              aria-current={isCurrent(item.number) ? 'page' : undefined}
              href={item.href}
              onClick={() => setOpen(false)}
            >
              <span>{item.number}</span>
              {item.label}
            </Link>
          ))}
          <div className="account-navigation">
            {user ? (
              <>
                <Link
                  className={path === '/dashboard' ? 'is-current' : undefined}
                  aria-current={path === '/dashboard' ? 'page' : undefined}
                  href="/dashboard"
                  onClick={() => setOpen(false)}
                >
                  My dashboard
                </Link>
                <Link
                  href="/notifications"
                  aria-label="Notifications"
                  className={path === '/notifications' ? 'is-current' : undefined}
                  aria-current={path === '/notifications' ? 'page' : undefined}
                  onClick={() => setOpen(false)}
                >
                  <Icon name="bell" size={17} />
                </Link>
                <button className="text-button" onClick={logout}>
                  Sign out
                </button>
              </>
            ) : (
              <Link
                className={path === '/login' ? 'is-current' : undefined}
                aria-current={path === '/login' ? 'page' : undefined}
                href="/login"
                onClick={() => setOpen(false)}
              >
                Sign in <Icon name="diagonal" size={14} />
              </Link>
            )}
          </div>
        </nav>
      </header>
      {error && (
        <div className="header-error" role="alert">
          {error}
        </div>
      )}
    </>
  );
}
