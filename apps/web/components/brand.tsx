import Link from 'next/link';

export function Brand() {
  return (
    <Link className="brand" href="/" aria-label="Kin home">
      <span className="brand-name">
        kin<span aria-hidden="true">.</span>
      </span>
      <span className="brand-tagline">HUMAN BY NATURE.</span>
    </Link>
  );
}
