/** Original SPIDER TV emblem: an angular spider glyph inside a web-cut shield. */
export function Emblem({ size = '2.75rem' }: { size?: string }) {
  return (
    <svg className="emblem" width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="emblem-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--accent-hi)" />
          <stop offset="1" stopColor="var(--accent)" />
        </linearGradient>
      </defs>
      <path d="M32 2 58 14v18c0 15-11 26-26 30C17 58 6 47 6 32V14z" fill="url(#emblem-g)" />
      <path d="M32 2v60M6 14l52 36M58 14 6 50M6 32h52" stroke="var(--on-accent)" strokeOpacity=".14" strokeWidth="1" fill="none" />
      <g fill="none" stroke="var(--on-accent)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M28.5 25 20 18l-3 5M35.5 25 44 18l3 5M28 30.5H17.5L14 34M36 30.5h10.5L50 34M28.5 36 21 43l1 6M35.5 36 43 43l-1 6" />
      </g>
      <path d="M32 17c3.2 0 5 2.4 5 5 0 1.8-1 3-1.6 3.4 2.4 1.7 3.6 4.8 3.6 8.4 0 6.6-3.3 11.7-7 11.7s-7-5.1-7-11.7c0-3.6 1.2-6.7 3.6-8.4-.6-.4-1.6-1.6-1.6-3.4 0-2.6 1.8-5 5-5z" fill="var(--on-accent)" />
    </svg>
  );
}

export function Logo() {
  return (
    <div className="logo" aria-label="SPIDER TV">
      <Emblem />
      <span className="logo__word">
        SPIDER<span className="logo__tv">TV</span>
      </span>
    </div>
  );
}
