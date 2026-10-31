'use client';
// Owner dashboard charts (Recharts): money trend, airfare trend and the attendance donut. Text / grid colours come from CSS (.dchart).
import { Area, AreaChart, Bar, CartesianGrid, Cell, ComposedChart, Legend, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

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

/** Monthly expenses (bars) against what the agency kept after them (net result line). */
export function ExpenseTrend({ months, expenses, net }: { months: string[]; expenses: number[]; net: number[] }) {
  const data = months.map((m, i) => ({ m, expenses: expenses[i], net: net[i] }));
  return (
    <div className="dchart"><ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 4" />
        <XAxis dataKey="m" tickFormatter={mon} {...axis} /><YAxis tickFormatter={k} width={56} {...axis} />
        <Tooltip formatter={(v) => full(v)} labelFormatter={monLong} />
        <Legend iconType="circle" iconSize={8} />
        <Bar dataKey="expenses" name="Expenses" fill={BROWN} radius={[4, 4, 0, 0]} maxBarSize={22} />
        <Line type="monotone" dataKey="net" name="Net result" stroke={GREEN} strokeWidth={2.5} dot={false} />
      </ComposedChart>
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

export function AttendanceDonut({ onTime, late, absent, pending }: { onTime: number; late: number; absent: number; pending: number }) {
  const rows = [
    { k: 'On time', n: onTime, c: GREEN }, { k: 'Late', n: late, c: BROWN }, { k: 'Absent', n: absent, c: RED }, { k: 'Not in yet', n: pending, c: GREY },
  ];
  const total = rows.reduce((a, r) => a + r.n, 0);
  const data = total ? rows : [{ k: 'No staff', n: 1, c: GREY }];
  return (
    <div className="ddonut">
      <div className="dchart small">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="n" nameKey="k" innerRadius="64%" outerRadius="92%" paddingAngle={total ? 2 : 0} stroke="none">
              {data.map((r, i) => <Cell key={i} fill={r.c} />)}
            </Pie>
            {total > 0 && <Tooltip />}
          </PieChart>
        </ResponsiveContainer>
        <div className="dcenter"><b>{total}</b><span>staff</span></div>
      </div>
      <ul className="dlegend">{rows.map((r) => <li key={r.k}><i style={{ background: r.c }} />{r.k}<b>{r.n}</b></li>)}</ul>
    </div>
  );
}
