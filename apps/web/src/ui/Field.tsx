import type { ReactNode } from 'react';

interface FieldProps {
  name: string;
  label: ReactNode;
  type?: string; // text | email | tel | number | date | time | password | textarea | select
  options?: (string | { value: string | number; label: string })[];
  value: string | number;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
  autoComplete?: string;
  maxLength?: number;
  min?: number | string;
  max?: number | string;
  step?: number | string;
  disabled?: boolean;
  hint?: ReactNode;
  autoFocus?: boolean;
}

/** Labelled input / select / textarea with an inline error, in the original `.field` markup. */
export default function Field({ name, label, type = 'text', options, value, onChange, error, hint, ...rest }: FieldProps) {
  const id = `f-${name}`;
  const common = { id, name, value, 'aria-invalid': !!error, onChange: (e: { target: { value: string } }) => onChange(e.target.value), ...rest };
  return (
    <div className={`field ${error ? 'has-err' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {type === 'textarea' ? (
        <textarea {...common} />
      ) : type === 'select' ? (
        <select {...common}>
          <option value="">— choose —</option>
          {options?.map((o) => {
            const ov = typeof o === 'string' ? { value: o, label: o } : o;
            return <option key={ov.value} value={ov.value}>{ov.label}</option>;
          })}
        </select>
      ) : (
        <input type={type} {...common} />
      )}
      {hint && <div className="small muted">{hint}</div>}
      {error && <div className="err">{error}</div>}
    </div>
  );
}

/** Checkbox row (consent, active flags). */
export function CheckField({ name, label, checked, onChange, error }: {
  name: string; label: ReactNode; checked: boolean; onChange: (checked: boolean) => void; error?: string;
}) {
  return (
    <div className={`field ${error ? 'has-err' : ''}`}>
      <label style={{ fontWeight: 500 }}>
        <input type="checkbox" name={name} checked={checked} onChange={(e) => onChange(e.target.checked)} /> {label}
      </label>
      {error && <div className="err">{error}</div>}
    </div>
  );
}
