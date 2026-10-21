import { useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';

export interface Per { from: string; to: string; key: string }

const OPTIONS: [string, string][] = [['day', 'Day'], ['month', 'This month'], ['quarter', 'This quarter'], ['year', 'This year'], ['custom', 'Custom range']];

/** Period selector shared by the dashboard and finance screens (the original filters form). */
export default function PeriodFilter({ per, children, hint }: { per: Per; children?: ReactNode; hint?: boolean }) {
  const [, setSp] = useSearchParams();
  const [period, setPeriod] = useState(per.key);
  const [from, setFrom] = useState(per.from);
  const [to, setTo] = useState(per.to);
  const apply = (p = period) => setSp({ period: p, from, to });

  return (
    <form className="card filters noprint" onSubmit={(e) => { e.preventDefault(); apply(); }}>
      <div>
        <label htmlFor="per">Period</label>
        <select id="per" value={period} onChange={(e) => { setPeriod(e.target.value); apply(e.target.value); }}>
          {OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      <div><label htmlFor="from">From</label><input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
      <div><label htmlFor="to">To</label><input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
      <div className="btnrow"><button className="btn">Apply</button>{children}</div>
      {hint && <div className="muted small grow">Showing {per.from} to {per.to}. Pick "Custom range" to use the dates.</div>}
    </form>
  );
}
