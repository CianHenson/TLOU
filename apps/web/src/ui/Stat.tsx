import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

/** Dashboard stat tile (original `.stat`); `tone` colours the number green/red. */
export default function Stat({ n, label, to, tone }: { n: ReactNode; label: string; to?: string; tone?: 'pos' | 'neg' }) {
  const body = (<><div className="n">{n}</div><div className="l">{label}</div></>);
  return to
    ? <Link to={to} className={`stat ${tone ?? ''}`} style={{ textDecoration: 'none', color: 'inherit' }}>{body}</Link>
    : <div className={`stat ${tone ?? ''}`}>{body}</div>;
}

export const Stats = ({ children }: { children: ReactNode }) => <div className="stats">{children}</div>;
