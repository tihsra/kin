'use client';

import Link from 'next/link';
import { Icon } from './icon';
import { Brand } from './brand';
import { useAuth } from './providers';

export function Footer() {
  const { user } = useAuth();
  return (
    <footer className="site-footer">
      <div className="footer-main">
        <div className="footer-introduction">
          <Brand />
          <p>
            Good people.
            <br />
            <span>Real connections.</span>
          </p>
        </div>
        <nav className="footer-chapters" aria-label="Explore Kin">
          <Link href="/discover">
            <span>01</span>Find your people
            <Icon name="diagonal" size={16} />
          </Link>
          <Link href={user ? '/settings' : '/register'}>
            <span>02</span>Be a donor
            <Icon name="diagonal" size={16} />
          </Link>
          <Link href="/requests/new">
            <span>03</span>Request help
            <Icon name="diagonal" size={16} />
          </Link>
        </nav>
        <div className="footer-about">
          <span className="eyebrow">THE NETWORK</span>
          <p>
            A place for willing donors and people looking for help to find each other, on their
            terms.
          </p>
          <Link className="editorial-link" href={user ? '/dashboard' : '/login'}>
            {user ? 'Your dashboard' : 'Sign in to Kin'}
            <Icon name="arrow" size={17} />
          </Link>
        </div>
      </div>
      <div className="footer-bottom">
        <span>BUILT AROUND PEOPLE.</span>
        <p>
          Collection requirements and donor suitability are confirmed by the hospital or blood
          centre.
        </p>
        <a href="https://eraktkosh.mohfw.gov.in/" target="_blank" rel="noreferrer">
          Blood-bank stock
          <Icon name="diagonal" size={13} />
        </a>
      </div>
    </footer>
  );
}
