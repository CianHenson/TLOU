'use client';
// The seven dashboard charts (Chart.js in the old app.js), rebuilt with Recharts using the same palette and series.
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Area, AreaChart } from 'recharts';
import type { ChartData } from '@/lib/queries/owner';

const col = ['#c99a2e', '#b5651d', '#2f7d4a', '#7a5c2e', '#b23a2b', '#e3c26a', '#8a6212', '#d98e4a'];
const peso = (v: number | string) => '₱' + Number(v).toLocaleString('en-PH');
const int = (v: number | string) => Number(v).toLocaleString('en-PH');

function Box({ title, children, wide }: { title: string; children: React.ReactElement; wide?: boolean }) {
  return (
    <div className="card" style={wide ? { gridColumn: '1/-1' } : undefined}>
      <h3>{title}</h3>
      <div className="chart"><ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer></div>
    </div>
  );
}

export function OwnerCharts({ d }: { d: ChartData }) {
  const money = d.months.map((m, i) => ({ m, sales: d.sales[i], collected: d.collected[i], expenses: d.expenses[i], net: d.net[i], inq: d.inquiries[i] }));
  const att = d.attMonths.map((m, i) => ({ m, n: d.attMonthly[i] }));
  const emp = d.perEmp.map((x) => ({ n: x.n, late: x.late, absent: x.absent }));
  const pie = (rows: { k: string; n: number }[], donut: boolean) => (
    <PieChart>
      <Pie data={rows} dataKey="n" nameKey="k" innerRadius={donut ? '50%' : 0} outerRadius="80%">
        {rows.map((_, i) => <Cell key={i} fill={col[i % col.length]} />)}
      </Pie>
      <Tooltip /><Legend />
    </PieChart>
  );
  return (
    <div className="charts">
      <Box title="Monthly booking sales & collections">
        <BarChart data={money}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="m" /><YAxis tickFormatter={peso} width={80} /><Tooltip formatter={(v) => peso(v as number)} /><Legend />
          <Bar dataKey="sales" name="Booking sales" fill={col[0]} /><Bar dataKey="collected" name="Collections" fill={col[1]} /></BarChart>
      </Box>
      <Box title="Monthly expenses & net operating result">
        <LineChart data={money}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="m" /><YAxis tickFormatter={peso} width={80} /><Tooltip formatter={(v) => peso(v as number)} /><Legend />
          <Line type="monotone" dataKey="expenses" name="Expenses" stroke={col[4]} /><Line type="monotone" dataKey="net" name="Net operating result" stroke={col[2]} /></LineChart>
      </Box>
      <Box title="Bookings by service type">{pie(d.byService, true)}</Box>
      <Box title="Booking status distribution">{pie(d.byStatus, false)}</Box>
      <Box title="Customer inquiry trend">
        <AreaChart data={money}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="m" /><YAxis allowDecimals={false} tickFormatter={int} /><Tooltip /><Legend />
          <Area type="monotone" dataKey="inq" name="New inquiries" stroke={col[0]} fill="#c99a2e33" /></AreaChart>
      </Box>
      <Box title="Monthly attendance records">
        <BarChart data={att}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="m" /><YAxis allowDecimals={false} /><Tooltip /><Legend />
          <Bar dataKey="n" name="Attendance records" fill={col[2]} /></BarChart>
      </Box>
      <Box title="Late arrivals & absences by employee (period)" wide>
        <BarChart data={emp}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="n" /><YAxis allowDecimals={false} /><Tooltip /><Legend />
          <Bar dataKey="late" name="Late" fill={col[1]} /><Bar dataKey="absent" name="Absent" fill={col[4]} /></BarChart>
      </Box>
    </div>
  );
}
