'use client';
// <ApiForm> posts a form as multipart FormData to a route handler (see lib/http.ts for the JSON contract) and then
// flashes the message, shows field errors, and either navigates (`redirect` from the server or the prop) or refreshes the page.
import { createContext, useContext, useState, type CSSProperties, type ReactNode, type InputHTMLAttributes } from 'react';
import { useRouter } from 'next/navigation';
import { useFlash } from './flash';

interface FormState { pending: boolean; errors: Record<string, string> }
const FormCtx = createContext<FormState>({ pending: false, errors: {} });

export function ApiForm({ action, children, className, style, reset, redirect, stay, confirm, onDone, prepare }: {
  action: string; children: ReactNode; className?: string; style?: CSSProperties;
  /** Clear the inputs after success. */
  reset?: boolean;
  /** Where to go after success (the server may override with { redirect }). Default: stay and refresh. */
  redirect?: string;
  /** Ignore any redirect and just refresh the current page (forms inside a dialog). */
  stay?: boolean;
  /** window.confirm() text before submitting. */
  confirm?: string;
  onDone?: (data: { ok: boolean; [k: string]: unknown }) => void;
  /** Runs before posting; may add fields to the FormData. Return an error message to stop the submit. */
  prepare?: (fd: FormData) => Promise<string | void>;
}) {
  const router = useRouter();
  const { show } = useFlash();
  const [state, setState] = useState<FormState>({ pending: false, errors: {} });

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (state.pending) return;
    const form = e.currentTarget;
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const ask = submitter?.dataset.confirm || confirm;
    if (ask && !window.confirm(ask)) return;
    setState({ pending: true, errors: {} });
    let data: { ok: boolean; msg?: string; redirect?: string; errors?: Record<string, string> };
    try {
      const body = new FormData(form, submitter);
      const problem = await prepare?.(body);
      if (problem) { setState({ pending: false, errors: {} }); show('err', problem); return; }
      const res = await fetch(action, { method: 'POST', body, credentials: 'same-origin' });
      data = await res.json();
      if (res.status === 401) { router.push('/login'); return; }
    } catch {
      data = { ok: false, msg: 'Network error. Please try again.' };
    }
    setState({ pending: false, errors: data.errors || {} });
    if (data.ok) {
      const to = stay ? undefined : data.redirect ?? redirect;
      if (data.msg) show('ok', data.msg, !!to);
      if (reset) form.reset();
      onDone?.(data);
      if (to) router.push(to); else router.refresh();
    } else {
      if (data.msg) show('err', data.msg);
      onDone?.(data);
    }
  }

  return (
    <FormCtx.Provider value={state}>
      <form onSubmit={submit} className={className} style={style} noValidate={false}>{children}</form>
    </FormCtx.Provider>
  );
}

export const useFormState = () => useContext(FormCtx);

/** Submit button: shows a spinner while the form is posting. `confirm` asks first. */
export function Submit({ children, className = 'btn', confirm, name, value, disabled }: {
  children: ReactNode; className?: string; confirm?: string; name?: string; value?: string; disabled?: boolean;
}) {
  const { pending } = useFormState();
  return (
    <button type="submit" className={className} name={name} value={value} data-confirm={confirm} disabled={pending || disabled}>
      {pending ? <><span className="spin" />Please wait…</> : children}
    </button>
  );
}

type Opt = string | number | [string | number, string];
type Attrs = Omit<InputHTMLAttributes<HTMLInputElement>, 'name' | 'type' | 'defaultValue' | 'children'> & { rows?: number };

/** Label + input/select/textarea + hint + server-side error (from the surrounding <ApiForm>). */
export function Field({ name, label, type = 'text', options, defaultValue, hint, attrs, error, emptyLabel = '— Select —' }: {
  name: string; label: string; type?: 'text' | 'textarea' | 'select' | 'number' | 'date' | 'email' | 'password' | 'time' | 'tel' | 'month';
  options?: Opt[]; defaultValue?: string | number | null; hint?: string; attrs?: Attrs;
  /** Error override (otherwise taken from the form's server response, keyed by `name`). */
  error?: string; emptyLabel?: string | null;
}) {
  const { errors } = useFormState();
  const e = error ?? errors[name];
  const val = defaultValue == null ? '' : String(defaultValue);
  const id = `f-${name}`;
  return (
    <div className={`field ${e ? 'has-err' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {type === 'select' ? (
        <select id={id} name={name} defaultValue={val} {...(attrs as object)}>
          {emptyLabel !== null && <option value="">{emptyLabel}</option>}
          {(options || []).map((o) => { const [v, l] = Array.isArray(o) ? o : [o, o]; return <option key={String(v)} value={String(v)}>{l}</option>; })}
        </select>
      ) : type === 'textarea' ? (
        <textarea id={id} name={name} defaultValue={val} {...(attrs as object)} />
      ) : (
        <input id={id} type={type} name={name} defaultValue={val} {...attrs} />
      )}
      {hint && <div className="small muted">{hint}</div>}
      {e && <div className="err" role="alert">{e}</div>}
    </div>
  );
}
