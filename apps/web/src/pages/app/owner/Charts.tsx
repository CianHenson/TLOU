import { Chart, registerables, type ChartConfiguration } from 'chart.js';
import { useEffect, useRef } from 'react';

Chart.register(...registerables);

export interface ChartData {
  months: string[]; sales: number[]; collected: number[]; expenses: number[]; net: number[];
  byService: { k: string; n: number }[]; byStatus: { k: string; n: number }[];
  inquiries: number[]; attMonthly: number[]; attMonths: string[];
  perEmp: { n: string; late: number; absent: number }[];
}

// Same palette and series as the original public/app.js dashboard charts.
const col = ['#c99a2e', '#b5651d', '#2f7d4a', '#7a5c2e', '#b23a2b', '#e3c26a', '#8a6212', '#d98e4a'];
const peso = (v: number | string) => '₱' + Number(v).toLocaleString('en-PH');

function ChartCanvas({ config }: { config: ChartConfiguration }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = new Chart(ref.current!, { ...config, options: { responsive: true, maintainAspectRatio: false, ...config.options } } as ChartConfiguration);
    return () => c.destroy();
  }, [config]);
  return <canvas ref={ref} />;
}

const Box = ({ title, children, wide }: { title: string; children: React.ReactNode; wide?: boolean }) => (
  <div className="card" style={wide ? { gridColumn: '1/-1' } : undefined}><h3>{title}</h3><div className="chart">{children}</div></div>
);

export default function Charts({ d }: { d: ChartData }) {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const money: any = { scales: { y: { ticks: { callback: (v: any) => peso(v) } } }, plugins: { tooltip: { callbacks: { label: (c: any) => `${c.dataset.label}: ${peso(c.parsed.y)}` } } } };
  const counts: any = { scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } };
  const cfg = (c: unknown) => c as ChartConfiguration;

  return (
    <div className="charts">
      <Box title="Monthly booking sales & collections">
        <ChartCanvas config={cfg({ type: 'bar', data: { labels: d.months, datasets: [{ label: 'Booking sales', data: d.sales, backgroundColor: col[0] }, { label: 'Collections', data: d.collected, backgroundColor: col[1] }] }, options: money })} />
      </Box>
      <Box title="Monthly expenses & net operating result">
        <ChartCanvas config={cfg({ type: 'line', data: { labels: d.months, datasets: [{ label: 'Expenses', data: d.expenses, borderColor: col[4], tension: 0.3 }, { label: 'Net operating result', data: d.net, borderColor: col[2], tension: 0.3 }] }, options: money })} />
      </Box>
      <Box title="Bookings by service type">
        <ChartCanvas config={cfg({ type: 'doughnut', data: { labels: d.byService.map((x) => x.k), datasets: [{ data: d.byService.map((x) => x.n), backgroundColor: col }] } })} />
      </Box>
      <Box title="Booking status distribution">
        <ChartCanvas config={cfg({ type: 'pie', data: { labels: d.byStatus.map((x) => x.k), datasets: [{ data: d.byStatus.map((x) => x.n), backgroundColor: col }] } })} />
      </Box>
      <Box title="Customer inquiry trend">
        <ChartCanvas config={cfg({ type: 'line', data: { labels: d.months, datasets: [{ label: 'New inquiries', data: d.inquiries, borderColor: col[0], fill: true, backgroundColor: '#c99a2e33', tension: 0.3 }] }, options: counts })} />
      </Box>
      <Box title="Monthly attendance records">
        <ChartCanvas config={cfg({ type: 'bar', data: { labels: d.attMonths, datasets: [{ label: 'Attendance records', data: d.attMonthly, backgroundColor: col[2] }] }, options: counts })} />
      </Box>
      <Box title="Late arrivals & absences by employee (period)" wide>
        <ChartCanvas config={cfg({ type: 'bar', data: { labels: d.perEmp.map((x) => x.n), datasets: [{ label: 'Late', data: d.perEmp.map((x) => x.late), backgroundColor: col[1] }, { label: 'Absent', data: d.perEmp.map((x) => x.absent), backgroundColor: col[4] }] }, options: counts })} />
      </Box>
    </div>
  );
}
