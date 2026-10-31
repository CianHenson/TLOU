// Entity shapes mirror the tables in the original lib/schema.js column for column (snake_case, integer
// centavos, 0/1 flags, Manila 'YYYY-MM-DD HH:mm:ss' timestamps) so porting logic - and later moving to a
// real database - needs no renaming.
export type Role = 'owner' | 'admin' | 'employee';
export const ROLE_LABELS: Record<string, string> = { owner: 'Owner', admin: 'Admin', employee: 'Staff' };

export interface User {
  id: number; emp_no: string; name: string; email: string; username: string; password_hash: string; role: Role;
  active: number; can_expenses: number; must_change_pw: number;
  sched_start: string; sched_end: string; grace_min: number; break_min: number; workdays: string; created_at: string;
}
export interface Customer {
  id: number; code: string; name: string; phone: string; email: string; pref_contact: string; notes: string; created_at: string;
}
export interface Service { id: number; name: string; type: string; description: string; icon: string; active: number; sort: number }

export interface TravelRequest {
  id: number; ref: string; customer_id: number; service_type: string; details: string; status: string; source: string;
  assigned_to: number | null; created_at: string;
}
export interface RequestLog {
  id: number; request_id: number; from_status: string | null; to_status: string; note: string; user_id: number | null; at: string;
}
export interface Note { id: number; entity: 'customer' | 'request' | 'booking'; entity_id: number; body: string; user_id: number | null; at: string }

export interface Booking {
  id: number; ref: string; customer_id: number; request_id: number | null; service_type: string; supplier: string; details: string;
  supplier_cost: number; selling_price: number; service_fee: number; discount: number;
  status: 'Quoted' | 'Confirmed' | 'Completed' | 'Cancelled'; assigned_to: number | null; confirmation_ref: string; remarks: string;
  created_at: string; updated_at: string | null;
}
export interface Payment {
  id: number; ref: string; booking_id: number; customer_id: number; paid_at: string; amount: number; method: string; reference: string;
  kind: 'Payment' | 'Refund'; status: 'Valid' | 'Reversed'; remarks: string; user_id: number | null;
  reversed_by: number | null; reversed_reason: string | null; created_at: string;
}
export interface Expense {
  id: number; spent_at: string; category: string; amount: number; method: string; description: string; receipt: string | null;
  user_id: number | null; status: 'Valid' | 'Voided'; void_reason: string | null; created_at: string;
}
export interface BookingDocument { id: number; booking_id: number; stored: string; original: string; user_id: number | null; at: string }

export interface Attendance {
  id: number; user_id: number; day: string; time_in: string | null; break_out: string | null; break_in: string | null; time_out: string | null; is_late: number; late_min: number;
}
export interface AttendanceCorrection {
  id: number; user_id: number; day: string; old_in: string | null; old_out: string | null; new_in: string | null; new_out: string | null;
  reason: string; by_user: number; at: string;
}
export interface Leave { id: number; user_id: number | null; day: string; kind: 'Leave' | 'Holiday'; note: string }
export interface AuditLog {
  id: number; at: string; user_id: number | null; username: string | null; action: string; entity: string | null;
  entity_id: string | null; detail: string; ip: string | null;
}
export interface Message { id: number; name: string; email: string; phone: string; body: string; at: string; handled: number }

// Key/value site settings, as in the original `settings` table.
export type SettingsMap = Record<string, string>;

export const STATUSES = [
  'Pending Review', 'Contacted', 'Awaiting Customer Confirmation', 'Quotation Sent', 'Awaiting Payment',
  'Processing Booking', 'Booked / Confirmed', 'Completed', 'Cancelled', 'Rejected',
];
export const OPEN_STATUSES = STATUSES.filter((s) => !['Completed', 'Cancelled', 'Rejected'].includes(s));
export const BOOKING_STATUSES = ['Quoted', 'Confirmed', 'Completed', 'Cancelled'];
export const SERVICE_TYPES = ['Domestic flight', 'International flight', 'Hotel reservation', 'Travel package', 'Group booking', 'Other travel service'];
export const METHODS = ['Cash', 'GCash', 'Maya', 'Bank transfer', 'Credit/debit card', 'Check', 'Other'];
/** The client's finance sheet columns, in sheet order (Finance Monitoring pivots expenses on these). */
export const EXPENSE_CATS = ['Operational', 'Staff & Payroll', 'Marketing & Advertising', 'Ticketing & Booking', 'Transportation & Vehicle',
  'Administrative & Legal', 'Insurance & Risk', 'Miscellaneous'];
export const CHECKIN_STATUSES = ['Pending', 'Done', 'Rebooked', 'No-show', 'Cancelled'];
export const AIRLINES = ['Philippine Airlines', 'Cebu Pacific', 'AirAsia', 'Royal Air', 'Airswift', 'Sunlight Air'];
export const CONTACT_METHODS = ['Phone call', 'SMS', 'Email', 'Viber', 'Messenger', 'WhatsApp'];

export const REQUEST_SOURCES = ['Walk-in', 'Phone call', 'Email', 'Social media'];
export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
/** Employee day-off / leave request types and review states (Attendance Monitoring → Requests). */
export const LEAVE_KINDS = ['Day off', 'Vacation leave', 'Sick leave', 'Emergency leave'];
export const LEAVE_STATUSES = ['Pending', 'Approved', 'Declined'];
export const LEAVE_BADGE: Record<string, string> = { Pending: 'b-warn', Approved: 'b-ok', Declined: 'b-err' };
/** Payroll periods: Weekly / Biweekly run 7 / 14 days from the start date, Monthly is the calendar month of the start date. */
export const PAY_PERIODS = ['Weekly', 'Biweekly', 'Monthly', 'Custom'];
/** Daily attendance statuses (see biz.daily) and their badge colours. */
export const ATT_BADGE: Record<string, string> = { Present: 'b-ok', Late: 'b-warn', Absent: 'b-err', Incomplete: 'b-err', 'Clocked in': 'b-info', 'Approved leave': 'b-info', Holiday: 'b-info' };
export const ATT_STATUSES = ['Present', 'Late', 'Clocked in', 'Incomplete', 'Absent', 'Approved leave', 'Holiday'];
// Row shapes joined/decorated by queries are loosely typed on purpose; pages cast as needed.
export type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

/** What a staff member can ask to correct on an attendance day (My Attendance → right-click → Apply for correction). */
export const CORR_FIELDS: [string, string][] = [['time_in', 'Time in'], ['break_out', 'Break out'], ['break_in', 'Break in'], ['time_out', 'Time out'], ['status', 'Status']];
