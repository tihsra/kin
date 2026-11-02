import type { CSSProperties } from 'react';
const paths: Record<string, React.ReactNode> = {
  arrow: (
    <>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </>
  ),
  diagonal: (
    <>
      <path d="M6 18 18 6M6 6h12v12" />
    </>
  ),
  pin: (
    <>
      <path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  drop: <path d="M12 3S5 11 5 15a7 7 0 0 0 14 0c0-4-7-12-7-12Z" />,
  check: <path d="m5 12 4 4L19 6" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  bell: (
    <>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
    </>
  ),
  shield: (
    <>
      <path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z" />
      <path d="m8 12 3 3 5-6" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  heart: (
    <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />
  ),
};
export function Icon({
  name,
  size = 20,
  style,
}: {
  name: string;
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={style}
    >
      {paths[name] || paths.arrow}
    </svg>
  );
}
