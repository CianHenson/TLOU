// Table definitions + first-run seed data (MySQL / MariaDB). Runs once per server process.
// Conventions carried over from the original SQLite schema: money in integer centavos (BIGINT), 0/1 flags,
// Manila-time timestamps stored as 'YYYY-MM-DD HH:mm:ss' strings and days as 'YYYY-MM-DD', so
// `SUBSTR(col,1,10) BETWEEN ? AND ?` style reporting queries work unchanged.
import { hashPassword } from './password';
import { now } from './util';
import { AIRLINES } from './types';
import type { Db } from './db';
import crypto from 'node:crypto';

const TABLES = [
  `CREATE TABLE IF NOT EXISTS settings (k VARCHAR(64) PRIMARY KEY, v MEDIUMTEXT)`,
  `CREATE TABLE IF NOT EXISTS services (
    id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(120) NOT NULL, type VARCHAR(40) NOT NULL, description TEXT, icon VARCHAR(16),
    active TINYINT NOT NULL DEFAULT 1, sort INT NOT NULL DEFAULT 0)`,
  `CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY, emp_no VARCHAR(20) UNIQUE, name VARCHAR(120) NOT NULL, first_name VARCHAR(60) NULL, last_name VARCHAR(60) NULL, email VARCHAR(160), username VARCHAR(40) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL, role VARCHAR(10) NOT NULL, designation VARCHAR(80) NULL, active TINYINT NOT NULL DEFAULT 1, can_expenses TINYINT NOT NULL DEFAULT 0,
    must_change_pw TINYINT NOT NULL DEFAULT 0, sched_start VARCHAR(5) NOT NULL DEFAULT '08:00', sched_end VARCHAR(5) NOT NULL DEFAULT '17:00',
    grace_min INT NOT NULL DEFAULT 10, break_min INT NOT NULL DEFAULT 60, workdays VARCHAR(20) NOT NULL DEFAULT '1,2,3,4,5',
    created_at VARCHAR(19) NOT NULL, CONSTRAINT ck_user_role CHECK (role IN ('owner','admin','employee')))`,
  `CREATE TABLE IF NOT EXISTS customers (
    id INT AUTO_INCREMENT PRIMARY KEY, code VARCHAR(20) UNIQUE, name VARCHAR(120) NOT NULL, phone VARCHAR(40), email VARCHAR(160),
    pref_contact VARCHAR(30), notes TEXT, created_at VARCHAR(19) NOT NULL, INDEX ix_cust_name (name), INDEX ix_cust_email (email))`,
  `CREATE TABLE IF NOT EXISTS requests (
    id INT AUTO_INCREMENT PRIMARY KEY, ref VARCHAR(30) NOT NULL UNIQUE, customer_id INT NOT NULL, service_type VARCHAR(40) NOT NULL,
    details MEDIUMTEXT NOT NULL, status VARCHAR(40) NOT NULL DEFAULT 'Pending Review', source VARCHAR(20) NOT NULL DEFAULT 'Website',
    assigned_to INT NULL, created_at VARCHAR(19) NOT NULL, INDEX ix_req_status (status),
    FOREIGN KEY (customer_id) REFERENCES customers(id), FOREIGN KEY (assigned_to) REFERENCES users(id))`,
  `CREATE TABLE IF NOT EXISTS request_log (
    id INT AUTO_INCREMENT PRIMARY KEY, request_id INT NOT NULL, from_status VARCHAR(40), to_status VARCHAR(40), note TEXT,
    user_id INT NULL, at VARCHAR(19) NOT NULL, FOREIGN KEY (request_id) REFERENCES requests(id), FOREIGN KEY (user_id) REFERENCES users(id))`,
  `CREATE TABLE IF NOT EXISTS notes (
    id INT AUTO_INCREMENT PRIMARY KEY, entity VARCHAR(30) NOT NULL, entity_id INT NOT NULL, body TEXT NOT NULL,
    user_id INT NULL, at VARCHAR(19) NOT NULL, INDEX ix_notes (entity, entity_id), FOREIGN KEY (user_id) REFERENCES users(id))`,
  `CREATE TABLE IF NOT EXISTS expenses (
    id INT AUTO_INCREMENT PRIMARY KEY, spent_at CHAR(10) NOT NULL, category VARCHAR(40) NOT NULL, amount BIGINT NOT NULL, method VARCHAR(30),
    description TEXT, receipt VARCHAR(80), user_id INT NULL, status VARCHAR(10) NOT NULL DEFAULT 'Valid', void_reason TEXT,
    created_at VARCHAR(19) NOT NULL, CONSTRAINT ck_exp_amt CHECK (amount > 0), CONSTRAINT ck_exp_status CHECK (status IN ('Valid','Voided')),
    FOREIGN KEY (user_id) REFERENCES users(id))`,
  `CREATE TABLE IF NOT EXISTS attendance (
    id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, day CHAR(10) NOT NULL, time_in VARCHAR(19), time_out VARCHAR(19),
    is_late TINYINT NOT NULL DEFAULT 0, late_min INT NOT NULL DEFAULT 0, UNIQUE KEY uq_att (user_id, day), FOREIGN KEY (user_id) REFERENCES users(id))`,
  `CREATE TABLE IF NOT EXISTS attendance_corrections (
    id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, day CHAR(10) NOT NULL, old_in VARCHAR(19), old_out VARCHAR(19),
    new_in VARCHAR(19), new_out VARCHAR(19), reason TEXT NOT NULL, by_user INT NOT NULL, at VARCHAR(19) NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS leaves (
    id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NULL, day CHAR(10) NOT NULL, kind VARCHAR(10) NOT NULL, note VARCHAR(200),
    UNIQUE KEY uq_leave (user_id, day, kind), CONSTRAINT ck_leave_kind CHECK (kind IN ('Leave','Holiday')))`,
  // Attendance & payroll: registered users (role 'employee' only) assigned as employees. One row per user; the account
  // details stay on `users`. hourly_rate is in centavos. Deactivated employees keep their history.
  `CREATE TABLE IF NOT EXISTS employees (
    id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, hourly_rate BIGINT NOT NULL DEFAULT 0, active TINYINT NOT NULL DEFAULT 1,
    created_by INT NULL, created_at VARCHAR(19) NOT NULL, updated_at VARCHAR(19) NULL, UNIQUE KEY uq_emp_user (user_id),
    CONSTRAINT ck_emp_rate CHECK (hourly_rate >= 0), FOREIGN KEY (user_id) REFERENCES users(id))`,
  // Employee day-off / leave requests. Approving one writes `leaves` rows (request_id) for the scheduled workdays it covers.
  `CREATE TABLE IF NOT EXISTS leave_requests (
    id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, kind VARCHAR(20) NOT NULL, from_day CHAR(10) NOT NULL, to_day CHAR(10) NOT NULL,
    reason TEXT NOT NULL, status VARCHAR(10) NOT NULL DEFAULT 'Pending', decline_reason TEXT NULL, created_at VARCHAR(19) NOT NULL,
    reviewed_by INT NULL, reviewed_at VARCHAR(19) NULL, INDEX ix_lr_user (user_id, from_day),
    CONSTRAINT ck_lr_status CHECK (status IN ('Pending','Approved','Declined')), CONSTRAINT ck_lr_days CHECK (to_day >= from_day),
    FOREIGN KEY (user_id) REFERENCES users(id))`,
  // Generated payroll: a frozen snapshot (days, minutes, the hourly rate at the time, amounts in centavos) that payslips
  // are printed from, so later rate changes or attendance corrections never alter it.
  `CREATE TABLE IF NOT EXISTS payroll (
    id INT AUTO_INCREMENT PRIMARY KEY, employee_id INT NOT NULL, user_id INT NOT NULL, period_kind VARCHAR(10) NOT NULL,
    period_from CHAR(10) NOT NULL, period_to CHAR(10) NOT NULL, days INT NOT NULL, minutes INT NOT NULL, incomplete INT NOT NULL DEFAULT 0,
    hourly_rate BIGINT NOT NULL, basic_pay BIGINT NOT NULL, adjustments BIGINT NOT NULL DEFAULT 0, adjustment_note VARCHAR(200) NULL,
    net_pay BIGINT NOT NULL, created_by INT NULL, created_at VARCHAR(19) NOT NULL, INDEX ix_pay_emp (employee_id, period_from),
    CONSTRAINT ck_pay_period CHECK (period_to >= period_from), FOREIGN KEY (employee_id) REFERENCES employees(id), FOREIGN KEY (user_id) REFERENCES users(id))`,
  `CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY, at VARCHAR(19) NOT NULL, user_id INT NULL, username VARCHAR(40), action VARCHAR(60) NOT NULL,
    entity VARCHAR(30), entity_id VARCHAR(60), detail MEDIUMTEXT, ip VARCHAR(64), INDEX ix_audit_at (at))`,
  // Passenger airfare sales & monitoring schedule (the client's Excel sheet). total_amount = what the customer pays
  // (airline fare + service charge); card_fee = credit/debit card fee the agency absorbs (stored positive, shown as a deduction).
  `CREATE TABLE IF NOT EXISTS airfare_sales (
    id INT AUTO_INCREMENT PRIMARY KEY, txn_date CHAR(10) NOT NULL, airline VARCHAR(80) NOT NULL, pnr VARCHAR(20) NOT NULL, pax INT NOT NULL DEFAULT 1,
    passenger VARCHAR(255) NOT NULL, contact VARCHAR(60), email_fb VARCHAR(160), origin VARCHAR(80) NOT NULL, destination VARCHAR(80) NOT NULL,
    travel_date CHAR(10) NOT NULL, travel_time VARCHAR(5), checkin_status VARCHAR(12) NOT NULL DEFAULT 'Pending', flight_no VARCHAR(40),
    total_amount BIGINT NOT NULL DEFAULT 0, service_charge BIGINT NOT NULL DEFAULT 0, card_fee BIGINT NOT NULL DEFAULT 0, remarks TEXT,
    user_id INT NULL, created_at VARCHAR(19) NOT NULL, updated_at VARCHAR(19) NULL,
    INDEX ix_af_txn (txn_date), INDEX ix_af_travel (travel_date), INDEX ix_af_pnr (pnr), FOREIGN KEY (user_id) REFERENCES users(id))`,
  // Trash / Delete Archive. A deleted airfare sale or expense is moved here as a full JSON snapshot, never erased: the staff member who
  // deleted it can restore it (or hide it for good) for 30 days, and the owner / admin can always restore it from the Delete Archive.
  `CREATE TABLE IF NOT EXISTS trash (
    id INT AUTO_INCREMENT PRIMARY KEY, kind VARCHAR(12) NOT NULL, entity_id INT NOT NULL, label VARCHAR(200) NOT NULL, detail VARCHAR(300) NULL,
    amount BIGINT NULL, data MEDIUMTEXT NOT NULL, deleted_by INT NOT NULL, deleted_role VARCHAR(10) NOT NULL, deleted_at VARCHAR(19) NOT NULL,
    hidden_at VARCHAR(19) NULL, restored_at VARCHAR(19) NULL, restored_by INT NULL, INDEX ix_trash_user (deleted_by, deleted_at), INDEX ix_trash_open (restored_at, deleted_at))`,
  `CREATE TABLE IF NOT EXISTS messages (
    id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(120), email VARCHAR(160), phone VARCHAR(40), body TEXT, at VARCHAR(19) NOT NULL,
    handled TINYINT NOT NULL DEFAULT 0)`,
  // Staff requests to correct one attendance day (changes = JSON [{field,value}]); the owner / admin approves (applies it) or declines with a reason.
  `CREATE TABLE IF NOT EXISTS attendance_correction_requests (
    id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, day CHAR(10) NOT NULL, changes TEXT NOT NULL, reason TEXT NOT NULL,
    status VARCHAR(10) NOT NULL DEFAULT 'Pending', decline_reason TEXT NULL, created_at VARCHAR(19) NOT NULL, reviewed_by INT NULL, reviewed_at VARCHAR(19) NULL,
    FOREIGN KEY (user_id) REFERENCES users(id))`,
  // Airline master list (Airlines page). Airfare sales keep the airline NAME as text, so renaming or deactivating an airline never changes old sales.
  `CREATE TABLE IF NOT EXISTS airlines (
    id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(80) NOT NULL, code VARCHAR(8) NULL, active TINYINT NOT NULL DEFAULT 1,
    created_by INT NULL, created_at VARCHAR(19) NOT NULL, updated_at VARCHAR(19) NULL, UNIQUE KEY uq_airline_name (name))`,
  // Payroll deductions set up by the owner / admin. kind and basis leave room for fixed amounts and other calculation bases later.
  // Rates live in deduction_rates (one row per change, with the date it takes effect), so history is kept and old payroll never changes.
  `CREATE TABLE IF NOT EXISTS deductions (
    id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(80) NOT NULL, kind VARCHAR(10) NOT NULL DEFAULT 'percent', basis VARCHAR(20) NOT NULL DEFAULT 'gross',
    created_by INT NULL, created_at VARCHAR(19) NOT NULL, UNIQUE KEY uq_ded_name (name))`,
  `CREATE TABLE IF NOT EXISTS deduction_rates (
    id INT AUTO_INCREMENT PRIMARY KEY, deduction_id INT NOT NULL, rate_bp INT NOT NULL, active TINYINT NOT NULL DEFAULT 1, effective_from CHAR(10) NOT NULL,
    changed_by INT NULL, changed_at VARCHAR(19) NOT NULL, INDEX ix_dr (deduction_id, effective_from),
    CONSTRAINT ck_dr_rate CHECK (rate_bp > 0 AND rate_bp <= 10000), FOREIGN KEY (deduction_id) REFERENCES deductions(id))`,
  // The deductions applied to one generated payroll record: a frozen copy (name, rate, basis amount, peso amount in centavos).
  `CREATE TABLE IF NOT EXISTS payroll_deductions (
    id INT AUTO_INCREMENT PRIMARY KEY, payroll_id INT NOT NULL, deduction_id INT NULL, name VARCHAR(80) NOT NULL, kind VARCHAR(10) NOT NULL DEFAULT 'percent',
    rate_bp INT NOT NULL, basis_amount BIGINT NOT NULL, amount BIGINT NOT NULL, INDEX ix_pd (payroll_id), FOREIGN KEY (payroll_id) REFERENCES payroll(id) ON DELETE CASCADE)`,
];

const DEFAULT_SETTINGS:Record<string, string> = {
  business_name: 'Alchemist Trip & Ride Travel Service',
  tagline: 'Your Travel Partner, One Click Away!',
  location: 'Puerto Princesa City, Palawan',
  phone: '', mobile: '0951 672 3814', email: 'alchemisttravelservices@gmail.com',
  address: 'Peneyra Rd, San Pedro, Puerto Princesa City, 5300 Palawan',
  map_url: 'https://www.google.com/maps/place/Alchemist+Trip%26Ride+Travel+Services/@9.7554194,118.7493331,17z/data=!3m1!4b1!4m6!3m5!1s0x33b5635892f8f5af:0x31ac69f7c4229ed7!8m2!3d9.7554141!4d118.751908!16s%2Fg%2F11zyrrnh4q?entry=ttu&g_ep=EgoyMDI2MTAxOS4wIKXMDSoASAFQAw%3D%3D',
  hours: '',
  facebook: 'https://www.facebook.com/AlchemistTravelServices', facebook_name: 'Alchemist Trip&Ride Travel Service', instagram: '',
  about: "Sa Alchemist Trip&Ride Travel Service, kasama mo kami mula booking hanggang biyahe.\n\nWe are a travel assistance service in Puerto Princesa City, Palawan. We help customers arrange domestic and international airline tickets, hotel reservations, car and van rentals and other travel needs. Our team coordinates with airlines and suppliers on your behalf, so you get clear options and honest quotations.\n\nNo more jumping between booking sites or worrying if you picked the right fare. Just tell us where and when you want to go, and we do the searching for you — then explain your options in plain words, with every cost laid out before you pay.\n\nOur help doesn't stop once you're booked. If your flight gets moved, your plans change or something unexpected comes up, you can message us and talk to a real person who already knows your trip.\n\nWhether you're a local heading out of Palawan or a visitor exploring it for the first time, we take care of the details — so all you have to do is enjoy the biyahe.",
  mission: 'To make travel easy, affordable and reliable by guiding every traveller from booking to biyahe.',
  vision: 'To be the most trusted travel partner in Palawan and beyond.',
  values: 'Travel made easy, Affordable, Reliable, Personalized service',
  fares_title: 'Lowest fares · selected dates only · September to December 2026',
  fares_note: 'Fares are per person, one-way, for selected dates only, and subject to change and seat availability. Send a request and our team will confirm the exact fare before anything is booked.',
  fares: 'Manila to Palawan|2714\nPalawan to Manila|2583\nPalawan to Iloilo|2327\nCebu to Cagayan de Oro|2344\nButuan City to Manila|2240\nCagayan de Oro to Cebu City|1870\nCaticlan to Manila|2330\nBacolod to Manila|1892',
  partners: 'Philippine Airlines, Cebu Pacific, AirAsia, Royal Air, Airswift, Starlite Ferries, Horizon Sun',
  why: [
    'May taong tutulong sa booking|Hindi mo kailangang gawin lahat mag-isa.',
    'Mas madaling magtanong|May mapagkukunan ka ng impormasyon tungkol sa flight, baggage, schedule, at requirements.',
    "Mas madali at mabilis|Maaaring maghanap ng available options para sa'yo.",
    'Assistance kapag may changes|Maaaring tumulong sa rebooking o concerns, depende sa airline at booking terms.',
    'Mas convenient para sa first-time travelers|May gabay bago ang biyahe.',
    'Personalized service|Maaaring iayon ang options sa budget at travel needs mo.',
  ].join('\n'),
  privacy: 'We collect your name, contact details and travel requirements only to respond to your request and to process bookings you approve. We do not sell your information. Access is limited to authorized staff, and records are kept only as long as needed for service, accounting and legal obligations, in line with the Philippine Data Privacy Act of 2012 (RA 10173). You may ask to access, correct or delete your data by contacting us.',
  retention_years: '5',
  // Time In is only allowed within office_radius metres of these coordinates (blank latitude/longitude turns the check off).
  office_lat: '9.7554141', office_lng: '118.751908', office_radius: '150',
};

const SERVICES: [string, string, string, string][] = [
  ['Domestic Flight Assistance', 'Domestic flight', 'We find and arrange domestic airline tickets that fit your schedule and budget.', '✈️'],
  ['International Flight Assistance', 'International flight', 'Help with international airfare, routing and ticketing for leisure or business travel.', '🌏'],
  ['Hotel Reservations', 'Hotel reservation', 'Hotel and accommodation arrangements in the Philippines and abroad.', '🏨'],
  ['Travel Package Assistance', 'Travel package', 'Combined flights, hotels and tours tailored to your trip.', '🧳'],
  ['Group Travel Bookings', 'Group booking', 'Group fares and rooming for families, teams, pilgrimages and events.', '👥'],
  ['Other Travel Services', 'Other travel service', 'Visa guidance, transfers, travel insurance and other travel needs.', '🧭'],
];

export async function ensureSchema(d: Db) {
  // The Transactions & Payments module (bookings, payments, booking documents) was removed; its tables are dropped (children first).
  await d.run('DROP TABLE IF EXISTS documents, payments, bookings');
  for (const t of TABLES) await d.run(t);
  // Columns added after the first release (CREATE TABLE IF NOT EXISTS leaves existing tables untouched).
  const hasCol = async (t: string, c: string) =>
    !!(await d.val('SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name=? AND column_name=?', [t, c]));
  if (!(await hasCol('expenses', 'updated_by'))) await d.run('ALTER TABLE expenses ADD COLUMN updated_by INT NULL, ADD COLUMN updated_at VARCHAR(19) NULL');
  if (!(await hasCol('users', 'signature'))) await d.run('ALTER TABLE users ADD COLUMN signature VARCHAR(80) NULL');
  if (!(await hasCol('users', 'designation'))) await d.run('ALTER TABLE users ADD COLUMN designation VARCHAR(80) NULL AFTER role');
  // Split names: existing users get the last word of `name` as last name and the rest as first name (`name` stays the full name).
  if (!(await hasCol('users', 'first_name'))) {
    await d.run('ALTER TABLE users ADD COLUMN first_name VARCHAR(60) NULL AFTER name, ADD COLUMN last_name VARCHAR(60) NULL AFTER first_name');
    await d.run(`UPDATE users SET
      first_name = CASE WHEN LOCATE(' ', TRIM(name)) = 0 THEN TRIM(name) ELSE TRIM(LEFT(TRIM(name), CHAR_LENGTH(TRIM(name)) - CHAR_LENGTH(SUBSTRING_INDEX(TRIM(name), ' ', -1)))) END,
      last_name = CASE WHEN LOCATE(' ', TRIM(name)) = 0 THEN '' ELSE SUBSTRING_INDEX(TRIM(name), ' ', -1) END`);
  }
  if (!(await hasCol('leaves', 'request_id'))) await d.run('ALTER TABLE leaves ADD COLUMN request_id INT NULL');
  // Break workflow (Time In -> Break Out -> Break In -> Time Out).
  if (!(await hasCol('attendance', 'break_out'))) await d.run('ALTER TABLE attendance ADD COLUMN break_out VARCHAR(19) NULL AFTER time_in, ADD COLUMN break_in VARCHAR(19) NULL AFTER break_out');
  // Where the device was when staff timed in (checked against the office location), kept so the owner can review it.
  if (!(await hasCol('users', 'can_messages'))) await d.run('ALTER TABLE users ADD COLUMN can_messages TINYINT NOT NULL DEFAULT 0');
  if (!(await hasCol('attendance', 'in_lat'))) await d.run('ALTER TABLE attendance ADD COLUMN in_lat DOUBLE NULL, ADD COLUMN in_lng DOUBLE NULL, ADD COLUMN in_dist INT NULL');
  // Payroll now has deductions: gross = basic + adjustments, net = gross - total deductions (older rows keep NULL = no deductions).
  if (!(await hasCol('payroll', 'gross_pay'))) await d.run('ALTER TABLE payroll ADD COLUMN gross_pay BIGINT NULL AFTER adjustment_note, ADD COLUMN total_deductions BIGINT NOT NULL DEFAULT 0 AFTER gross_pay');
  // Every Staff account must be an employee record to clock in; accounts created through User Management used to miss it.
  await d.run(`INSERT IGNORE INTO employees (user_id,hourly_rate,active,created_at) SELECT id,0,1,? FROM users WHERE role='employee' AND id NOT IN (SELECT user_id FROM employees)`, [now()]);
  // Airlines: seed from the standard list plus anything already used in airfare sales.
  if (!(await d.val('SELECT COUNT(*) FROM airlines'))) {
    const used = await d.all<{ airline: string }>(`SELECT DISTINCT airline FROM airfare_sales WHERE airline<>''`);
    for (const a of [...new Set([...AIRLINES, ...used.map((r) => r.airline)])]) await d.run('INSERT IGNORE INTO airlines (name,active,created_at) VALUES (?,1,?)', [a, now()]);
  }
  // First run with the employees table: every existing Staff account becomes an employee (rate 0, to be set by the owner),
  // so attendance monitoring keeps covering the people it covered before.
  if (!(await d.val("SELECT COUNT(*) FROM settings WHERE k='_employees_seeded'"))) {
    await d.run(`INSERT IGNORE INTO employees (user_id,hourly_rate,active,created_at) SELECT id,0,active,? FROM users WHERE role='employee'`, [now()]);
    await d.run("INSERT INTO settings (k,v) VALUES ('_employees_seeded','1')");
  }
  // The Admin role (same access as the owner; there is only ever one owner).
  const roleCheck = await d.val(`SELECT CHECK_CLAUSE FROM information_schema.CHECK_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND CONSTRAINT_NAME='ck_user_role'`).catch(() => null);
  if (roleCheck && !String(roleCheck).includes('admin')) {
    await d.run('ALTER TABLE users DROP CONSTRAINT ck_user_role');
    await d.run(`ALTER TABLE users ADD CONSTRAINT ck_user_role CHECK (role IN ('owner','admin','employee'))`);
  }
  const have = new Set((await d.all<{ k: string }>('SELECT k FROM settings')).map((r) => r.k));
  for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) if (!have.has(k)) await d.run('INSERT INTO settings (k,v) VALUES (?,?)', [k, v]);
  if (!(await d.val('SELECT COUNT(*) FROM services'))) {
    for (const [i, s] of SERVICES.entries()) await d.run('INSERT INTO services (name,type,description,icon,sort) VALUES (?,?,?,?,?)', [...s, i]);
  }
  if (!(await d.val('SELECT COUNT(*) FROM users'))) {
    const pw = process.env.OWNER_PASSWORD || crypto.randomBytes(9).toString('base64url');
    await d.run(
      `INSERT INTO users (emp_no,name,first_name,last_name,username,password_hash,role,can_expenses,must_change_pw,created_at) VALUES ('EMP-0001','Owner','Owner','','owner',?, 'owner',1,1,?)`,
      [await hashPassword(pw), now()],
    );
    console.log(`\n  First-run owner account created.\n  Username: owner\n  Password: ${pw}   (you will be asked to change it at first login)\n`);
  }
}
