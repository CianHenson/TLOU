import { badgeClass } from '../lib/format';

/** Coloured status pill. */
export default function Badge({ children, cls }: { children: string; cls?: string }) {
  return <span className={`badge ${cls ?? badgeClass(children)}`}>{children}</span>;
}
