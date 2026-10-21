// Amounts are integer centavos; timestamps are Manila 'YYYY-MM-DD HH:mm:ss' strings (as in the original app).
export const peso = (c: number | null | undefined) =>
  '₱' + ((c || 0) / 100).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Centavos -> "1234.50" for form inputs. */
export const pesoInput = (c: number | null | undefined) => ((c || 0) / 100).toFixed(2);

export const hrs = (m: number) => (m / 60).toFixed(2);
export const dateOf = (ts: string | null | undefined) => (ts ? ts.slice(0, 10) : '');
export const timeOf = (ts: string | null | undefined) => (ts ? ts.slice(11, 16) : '—');
export const dateTime = (ts: string | null | undefined) => (ts ? ts.slice(0, 16) : '');

export const today = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Manila' });

/** Badge colour class for a status word. */
export function badgeClass(s: string): string {
  if (['Completed', 'Booked / Confirmed', 'Confirmed', 'Paid', 'Valid', 'Present', 'Payment', 'Clocked in'].includes(s)) return 'b-ok';
  if (['Cancelled', 'Rejected', 'Voided', 'Reversed', 'Absent', 'Refund', 'Overpaid', 'Incomplete'].includes(s)) return 'b-err';
  if (['Pending Review', 'Quoted', 'Unpaid', 'Partially Paid', 'Late', 'Pending', 'Awaiting Payment', 'Awaiting Customer Confirmation'].includes(s)) return 'b-warn';
  if (['Contacted', 'Quotation Sent', 'Processing Booking', 'Holiday', 'Approved leave'].includes(s)) return 'b-info';
  return '';
}
