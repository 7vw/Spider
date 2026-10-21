import type { ReactNode } from 'react';

/** A titled horizontal shelf. Each row is a navigation group, so returning to it restores the last tile. */
export function Row({ id, title, children, size = 'md' }: { id: string; title: string; children: ReactNode; size?: 'md' | 'lg' }) {
  return (
    <section className={`row row--${size}`} data-scroll-row>
      <h2 className="row__title">{title}</h2>
      <div className="row__track" data-nav-group={id}>
        {children}
      </div>
    </section>
  );
}
