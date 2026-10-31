'use client';
// "Batch Upload" header button (beside the + button): opens a dialog that takes a CSV file only. The file is checked in the
// browser first (type, size) and then fully validated on the server before anything is saved; if any row is wrong nothing is
// imported and the rows at fault are listed. On success the dialog closes and the page refreshes (tables and totals update).
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from './modal';
import { useFlash } from './flash';
import { templateCsv, MAX_CSV_BYTES, type CsvColumn } from '@/lib/csv';

type Problem = { where: string; msg: string };

function Dialog({ title, action, cols, template, onClose }: { title: string; action: string; cols: CsvColumn[]; template: string; onClose: () => void }) {
  const router = useRouter();
  const { show } = useFlash();
  const input = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [problems, setProblems] = useState<Problem[]>([]);

  const pick = (f?: File) => {
    setProblems([]); setMsg(''); setName(f?.name ?? '');
    if (!f) return;
    if (!/\.csv$/i.test(f.name)) { setMsg('Only CSV files (.csv) can be uploaded.'); if (input.current) input.current.value = ''; setName(''); }
    else if (f.size > MAX_CSV_BYTES) { setMsg('The file is too large (maximum 1 MB).'); if (input.current) input.current.value = ''; setName(''); }
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([templateCsv(cols)], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = template; a.click(); URL.revokeObjectURL(url);
  };
  const upload = async (close: () => void) => {
    const f = input.current?.files?.[0];
    if (!f) { setMsg('Choose a CSV file to upload.'); return; }
    setBusy(true); setMsg(''); setProblems([]);
    try {
      const fd = new FormData(); fd.set('file', f);
      const res = await fetch(action, { method: 'POST', body: fd, credentials: 'same-origin' });
      const d = await res.json();
      if (d.ok) { show('ok', d.msg || 'Imported.'); router.refresh(); close(); return; }
      setMsg(d.msg || 'The upload failed.');
      setProblems(Object.entries((d.errors ?? {}) as Record<string, string>).filter(([k]) => k !== 'File').map(([where, m]) => ({ where, msg: m })));
    } catch { setMsg('Network error. Please try again.'); } finally { setBusy(false); }
  };

  return (
    <Modal title={title} onClose={onClose} width={640}>
      {(close) => (
        <>
          <p className="small muted" style={{ marginTop: 0 }}>Upload a <strong>.csv</strong> file with one record per row. The first row must be the column headers. If any row has a problem, nothing is imported and you will see which rows to fix.</p>
          <p className="small" style={{ margin: '0 0 8px' }}><strong>Columns</strong> (* required): {cols.map((c) => c.label + (c.required ? '*' : '')).join(' · ')}</p>
          <div className="row" style={{ alignItems: 'center', marginBottom: 12 }}>
            <input ref={input} type="file" accept=".csv,text/csv" onChange={(e) => pick(e.target.files?.[0])} aria-label="CSV file" />
            <button type="button" className="btn ghost sm" onClick={download}>Download template</button>
          </div>
          {msg && <div className="bu-msg" role="alert">{msg}</div>}
          {problems.length > 0 && (
            <div className="bu-list" role="list" aria-label="Rows to fix">
              {problems.slice(0, 50).map((p) => <div key={p.where} role="listitem"><b>{p.where}</b> {p.msg}</div>)}
              {problems.length > 50 && <div className="muted">…and {problems.length - 50} more rows.</div>}
            </div>
          )}
          <div className="row" style={{ marginTop: 12 }}>
            <button type="button" className="btn" disabled={busy || !name} onClick={() => upload(close)}>{busy ? <><span className="spin" />Uploading…</> : 'Upload'}</button>
            <button type="button" className="btn ghost" onClick={close}>Cancel</button>
          </div>
        </>
      )}
    </Modal>
  );
}

export function BatchUploadButton(props: { title?: string; action: string; cols: CsvColumn[]; template: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="btn ghost" onClick={() => setOpen(true)} aria-haspopup="dialog" title="Upload many records from a CSV file">
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 15V3M7 8l5-5 5 5M5 21h14" /></svg>Batch Upload
      </button>
      {open && <Dialog title={props.title ?? 'Batch upload'} action={props.action} cols={props.cols} template={props.template} onClose={() => setOpen(false)} />}
    </>
  );
}
