// Small shared server-renderable pieces for the owner pages: period filter, stat card link.
import { AutoSelect, PrintButton } from './widgets';
import { PERIODS } from '@/lib/queries/owner';

/** GET period filter for the module header (dashboard + finance). `exportHref` adds the CSV + print buttons (finance). */
export function PeriodFilter({ per, exportHref }: { per: { key: string; from: string; to: string }; exportHref?: string }) {
  return (
    <form className={`filters ${exportHref ? 'noprint' : ''}`} method="get">
      <div><label htmlFor="per">Period</label>
        <AutoSelect id="per" name="period" defaultValue={per.key}>{PERIODS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</AutoSelect></div>
      <div><label htmlFor="from">From</label><input id="from" type="date" name="from" defaultValue={per.from} /></div>
      <div><label htmlFor="to">To</label><input id="to" type="date" name="to" defaultValue={per.to} /></div>
      <div className="btnrow">
        <button className="btn">Apply</button>
        {exportHref && <><a className="btn ghost" href={exportHref}>Export CSV</a><PrintButton className="btn ghost">PDF / Print</PrintButton></>}
      </div>
    </form>
  );
}
