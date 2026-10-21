// Original stroke icon set on a 24px grid. No emoji anywhere in the system UI.
const PATHS = {
  home: 'M3 10.5 12 3l9 7.5M5.5 8.5V20a1 1 0 0 0 1 1H10v-6h4v6h3.5a1 1 0 0 0 1-1V8.5',
  apps: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
  film: 'M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM7 3v18M17 3v18M3 8h4M3 12h4M3 16h4M17 8h4M17 12h4M17 16h4',
  folder: 'M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  settings: 'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM19.4 13.5l1.6 1.2-2 3.4-1.9-.7a7.6 7.6 0 0 1-2.1 1.2L14.7 21h-4l-.3-2.4a7.6 7.6 0 0 1-2.1-1.2l-1.9.7-2-3.4 1.6-1.2a7.8 7.8 0 0 1 0-3l-1.6-1.2 2-3.4 1.9.7a7.6 7.6 0 0 1 2.1-1.2L10.7 3h4l.3 2.4a7.6 7.6 0 0 1 2.1 1.2l1.9-.7 2 3.4-1.6 1.2a7.8 7.8 0 0 1 0 3z',
  search: 'M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15zM21 21l-5.2-5.2',
  wifi: 'M2 8.8a15 15 0 0 1 20 0M5.2 12.3a10.4 10.4 0 0 1 13.6 0M8.5 15.8a5.6 5.6 0 0 1 7 0M12 19.5h.01',
  wifiOff: 'M3 3l18 18M8.5 15.8a5.6 5.6 0 0 1 7 0M5.2 12.3a10.4 10.4 0 0 1 4.3-2.4M2 8.8a15 15 0 0 1 5-3M14.8 9.4a10.4 10.4 0 0 1 4 2.9M12 19.5h.01',
  globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z',
  bluetooth: 'M7 7l10 10-5 4V3l5 4L7 17',
  display: 'M3 5a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1zM8 21h8M12 17v4',
  volume: 'M4 9.5h3.5L12 5v14l-4.5-4.5H4zM16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11',
  mute: 'M4 9.5h3.5L12 5v14l-4.5-4.5H4zM16 9.5l5 5M21 9.5l-5 5',
  storage: 'M4 6.5C4 4.6 7.6 3 12 3s8 1.6 8 3.5S16.4 10 12 10 4 8.4 4 6.5zM4 6.5v11C4 19.4 7.6 21 12 21s8-1.6 8-3.5v-11M4 12c0 1.9 3.6 3.5 8 3.5s8-1.6 8-3.5',
  palette: 'M12 3a9 9 0 0 0 0 18c1.1 0 1.8-.8 1.8-1.8 0-.5-.2-.9-.5-1.2-.3-.3-.5-.8-.5-1.2 0-1 .8-1.8 1.8-1.8H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3zM7.5 12.5h.01M9.5 8h.01M14.5 8h.01M17 11.5h.01',
  language: 'M4 5h9M8.5 3v2M6 5c.6 3.6 3 6.4 6 8M11 5c-.8 4.2-3.5 7.6-7 9.5M13 21l4-9 4 9M14.3 18h5.4',
  cast: 'M3 17a4 4 0 0 1 4 4M3 13a8 8 0 0 1 8 8M3 9.2A11.8 11.8 0 0 1 14.8 21M3 6V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-1',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v6M12 7.5h.01',
  update: 'M20 12a8 8 0 1 1-2.3-5.6M20 4v5h-5',
  play: 'M7 4.5v15a.5.5 0 0 0 .8.4l11.4-7.5a.5.5 0 0 0 0-.8L7.8 4.1a.5.5 0 0 0-.8.4z',
  pause: 'M7 4h3v16H7zM14 4h3v16h-3z',
  rewind: 'M11 7 6 12l5 5M18 7l-5 5 5 5',
  forward: 'M13 7l5 5-5 5M6 7l5 5-5 5',
  star: 'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.9z',
  check: 'M4.5 12.5 9.5 17.5 19.5 6.5',
  chevronRight: 'M9 5l7 7-7 7',
  chevronLeft: 'M15 5l-7 7 7 7',
  chevronUp: 'M5 15l7-7 7 7',
  file: 'M6 3h8l5 5v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM14 3v5h5',
  image: 'M4 5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1zM4 16l4.5-4.5 4 4 3-3L20 17M15.5 9.5h.01',
  music: 'M9 18V5.5l11-2V16M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM20 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
  video: 'M3 6.5a1.5 1.5 0 0 1 1.5-1.5h10A1.5 1.5 0 0 1 16 6.5v11a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 3 17.5zM16 10l5-3v10l-5-3',
  alert: 'M12 3.5 22 20H2zM12 10v4.5M12 17.5h.01',
  close: 'M6 6l12 12M18 6 6 18',
  external: 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5',
  cpu: 'M7 7h10v10H7zM9.5 3v4M14.5 3v4M9.5 17v4M14.5 17v4M3 9.5h4M3 14.5h4M17 9.5h4M17 14.5h4',
  backspace: 'M8 5h12a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H8l-6-7zM11 9l6 6M17 9l-6 6',
  space: 'M4 10v4h16v-4',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  keyboard: 'M3 6h18v12H3zM7 10h.01M11 10h.01M15 10h.01M7 14h10',
  browser: 'M3 5a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1zM3 9h18M6.5 6.5h.01M9 6.5h.01',
  lock: 'M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3',
  refresh: 'M4 12a8 8 0 0 1 14-5.3L20 9M20 4v5h-5M20 12a8 8 0 0 1-14 5.3L4 15M4 20v-5h5',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = '1em', filled = false, className }: { name: IconName; size?: string; filled?: boolean; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
