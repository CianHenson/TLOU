'use client';
// Owner dashboard charts (Recharts): money trend, airfare trend and the attendance donut. Text / grid colours come from CSS (.dchart).
import { useState } from 'react';
import { Area, AreaChart, CartesianGrid, Cell, LineChart, Legend, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const GOLD = '#c99a2e', BROWN = '#b5651d', GREEN = '#2f7d4a', RED = '#b23a2b', GREY = '#cfc7b0';
const k = (v: number | string) => { const n = Number(v); return '₱' + (Math.abs(n) >= 1000 ? (n / 1000).toLocaleString('en-PH', { maximumFractionDigits: 1 }) + 'k' : n.toLocaleString('en-PH')); };
const full = (v: unknown) => '₱' + Number(v).toLocaleString('en-PH', { maximumFractionDigits: 2 });
const date = (m: unknown) => new Date(m + '-01T00:00:00');
const mon = (m: string) => date(m).toLocaleDateString('en-PH', { month: 'short' });
const monLong = (m: unknown) => date(m).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });
const axis = { tickLine: false, axisLine: false } as const;

export function Panel({ title, sub, children, span }: { title: string; sub?: string; children: React.ReactNode; span?: boolean }) {
  return (
    <section className={`card dpanel${span ? ' span2' : ''}`}>
      <header><h3>{title}</h3>{sub && <span className="muted small">{sub}</span>}</header>
      {children}
    </section>
  );
}

/** Net result by month: what the agency kept after expenses. */
export function ExpenseTrend({ months, expenses, net }: { months: string[]; expenses: number[]; net: number[] }) {
  const data = months.map((m, i) => ({ m, expenses: expenses[i], net: net[i] }));
  return (
    <div className="dchart"><ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 4" />
        <XAxis dataKey="m" tickFormatter={mon} {...axis} /><YAxis tickFormatter={k} width={56} {...axis} />
        <Tooltip formatter={(v) => full(v)} labelFormatter={monLong} />
        <Legend iconType="circle" iconSize={8} />
        <Line type="monotone" dataKey="net" name="Net result" stroke={GREEN} strokeWidth={2.5} dot={false} />
      </LineChart>
    </ResponsiveContainer></div>
  );
}

export function AirfareTrend({ data }: { data: { m: string; total: number; income: number }[] }) {
  return (
    <div className="dchart"><ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="gTotal" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={GOLD} stopOpacity={0.45} /><stop offset="100%" stopColor={GOLD} stopOpacity={0.02} /></linearGradient>
          <linearGradient id="gInc" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={GREEN} stopOpacity={0.35} /><stop offset="100%" stopColor={GREEN} stopOpacity={0.02} /></linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 4" />
        <XAxis dataKey="m" tickFormatter={mon} {...axis} /><YAxis tickFormatter={k} width={56} {...axis} />
        <Tooltip formatter={(v) => full(v)} labelFormatter={monLong} />
        <Legend iconType="circle" iconSize={8} />
        <Area type="monotone" dataKey="total" name="Amount collected" stroke={GOLD} strokeWidth={2.5} fill="url(#gTotal)" />
        <Area type="monotone" dataKey="income" name="Agency income" stroke={GREEN} strokeWidth={2.5} fill="url(#gInc)" />
      </AreaChart>
    </ResponsiveContainer></div>
  );
}

/**
 * Attendance donut. Click legend items to chart only those groups (several can be selected); a group that is not selected gets a
 * grey circle. Clicking a selected item removes it; with nothing selected every group is charted in its own colour.
 */
export function AttendanceDonut({ onTime, late, absent, pending }: { onTime: number; late: number; absent: number; pending: number }) {
  const rows = [
    { k: 'On time', n: onTime, c: GREEN }, { k: 'Late', n: late, c: BROWN }, { k: 'Absent', n: absent, c: RED }, { k: 'Not in yet', n: pending, c: GREY },
  ];
  const [picked, setPicked] = useState<string[]>([]);
  const on = (k: string) => !picked.length || picked.includes(k); // nothing selected = all groups applied
  const toggle = (k: string) => setPicked((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));
  const active = rows.filter((r) => on(r.k));
  const shown = active.reduce((a, r) => a + r.n, 0);
  const data = shown ? active.filter((r) => r.n) : [{ k: picked.length ? 'None' : 'No staff', n: 1, c: GREY }];
  const label = !picked.length ? 'staff' : picked.length === 1 ? picked[0].toLowerCase() : 'selected';
  return (
    <div className="ddonut">
      <div className="dchart small">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="n" nameKey="k" innerRadius="64%" outerRadius="92%" paddingAngle={shown && data.length > 1 ? 2 : 0} stroke="none" isAnimationActive={false}>
              {data.map((r, i) => <Cell key={i} fill={r.c} />)}
            </Pie>
            {shown > 0 && <Tooltip />}
          </PieChart>
        </ResponsiveContainer>
        <div className="dcenter"><b>{shown}</b><span>{label}</span></div>
      </div>
      <ul className="dlegend">{rows.map((r) => (
        <li key={r.k}>
          <button type="button" className={on(r.k) ? undefined : "off"} aria-pressed={picked.includes(r.k)} title={picked.includes(r.k) ? `Remove ${r.k} from the chart` : `Show ${r.k} on the chart`} onClick={() => toggle(r.k)}><i style={{ background: on(r.k) ? r.c : '#cfc7b0' }} />{r.k}</button>
          <b>{r.n}</b>
        </li>
      ))}</ul>
    </div>
  );
}
