'use client';
// In-app confirmation dialog: a centred modal in the system's style instead of the browser's window.confirm().
// <ConfirmHost /> is mounted once in the app layout; anywhere in the client, `await askConfirm({ message })` resolves
// true (confirmed) or false (cancelled / closed).
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Modal } from './modal';

export interface ConfirmOptions { title?: string; message: ReactNode; confirmLabel?: string; cancelLabel?: string; danger?: boolean }
type Pending = ConfirmOptions & { resolve: (ok: boolean) => void };

let show: ((p: Pending) => void) | null = null;

/** Ask the user to confirm. Falls back to window.confirm if the host is not mounted. */
export function askConfirm(o: ConfirmOptions): Promise<boolean> {
  if (!show) return Promise.resolve(window.confirm(typeof o.message === 'string' ? o.message : 'Are you sure?'));
  return new Promise((resolve) => show!({ ...o, resolve }));
}

/** Export link click: with a `note`, ask first and start the download only on OK. */
export async function confirmExport(e: React.MouseEvent, href: string, note?: string) {
  if (!note) return;
  e.preventDefault();
  if (await askConfirm({ title: 'Export filtered records', message: note, confirmLabel: 'Export' })) window.location.href = href;
}

export function ConfirmHost() {
  const [cur, setCur] = useState<Pending | null>(null);
  const answer = useRef(false);
  useEffect(() => {
    show = (p) => { answer.current = false; setCur(p); };
    return () => { show = null; };
  }, []);
  if (!cur) return null;
  return (
    <Modal title={cur.title ?? 'Please confirm'} width={460} onClose={() => { cur.resolve(answer.current); setCur(null); }}>
      {(close) => (
        <div className="confirm">
          <p>{cur.message}</p>
          <div className="row">
            <button type="button" className={cur.danger ? 'btn danger' : 'btn'} autoFocus onClick={() => { answer.current = true; close(); }}>{cur.confirmLabel ?? 'OK'}</button>
            <button type="button" className="btn ghost" onClick={close}>{cur.cancelLabel ?? 'Cancel'}</button>
          </div>
        </div>
      )}
    </Modal>
  );
}
