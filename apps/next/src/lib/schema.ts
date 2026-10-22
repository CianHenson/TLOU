// Table definitions + first-run seed data (MySQL / MariaDB). Runs once per server process.
// Conventions carried over from the original SQLite schema: money in integer centavos (BIGINT), 0/1 flags,
// Manila-time timestamps stored as 'YYYY-MM-DD HH:mm:ss' strings and days as 'YYYY-MM-DD', so
// `SUBSTR(col,1,10) BETWEEN ? AND ?` style reporting queries work unchanged.
import { hashPassword } from './password';
import { now } from './util';
import type { Db } from './db';
import crypto from 'node:crypto';

const TABLES = [
  `CREATE TABLE IF NOT EXISTS settings (k VARCHAR(64) PRIMARY KEY, v MEDIUMTEXT)`,
  `CREATE TABLE IF NOT EXISTS services (
    id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(120) NOT NULL, type VARCHAR(40) NOT NULL, description TEXT, icon VARCHAR(16),
    active TINYINT NOT NULL DEFAULT 1, sort INT NOT NULL DEFAULT 0)`,
  `CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY, emp_no VARCHAR(20) UNIQUE, name VARCHAR(120) NOT NULL, email VARCHAR(160), username VARCHAR(40) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL, role VARCHAR(10) NOT NULL, active TINYINT NOT NULL DEFAULT 1, can_expenses TINYINT NOT NULL DEFAULT 0,
    must_change_pw TINYINT NOT NULL DEFAULT 0, sched_start VARCHAR(5) NOT NULL DEFAULT '08:00', sched_end VARCHAR(5) NOT NULL DEFAULT '17:00',
    grace_min INT NOT NULL DEFAULT 10, break_min INT NOT NULL DEFAULT 60, workdays VARCHAR(20) NOT NULL DEFAULT '1,2,3,4,5',
    created_at VARCHAR(19) NOT NULL, CONSTRAINT ck_user_role CHECK (role IN ('owner','employee')))`,
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
  `CREATE TABLE IF NOT EXISTS bookings (
    id INT AUTO_INCREMENT PRIMARY KEY, ref VARCHAR(30) UNIQUE, customer_id INT NOT NULL, request_id INT NULL, service_type VARCHAR(40) NOT NULL,
    supplier VARCHAR(160), details TEXT, supplier_cost BIGINT NOT NULL DEFAULT 0, selling_price BIGINT NOT NULL DEFAULT 0,
    service_fee BIGINT NOT NULL DEFAULT 0, discount BIGINT NOT NULL DEFAULT 0, status VARCHAR(12) NOT NULL DEFAULT 'Quoted',
    assigned_to INT NULL, confirmation_ref VARCHAR(80), remarks TEXT, created_at VARCHAR(19) NOT NULL, updated_at VARCHAR(19) NULL,
    INDEX ix_bk_cust (customer_id), CONSTRAINT ck_bk_status CHECK (status IN ('Quoted','Confirmed','Completed','Cancelled')),
    FOREIGN KEY (customer_id) REFERENCES customers(id), FOREIGN KEY (request_id) REFERENCES requests(id), FOREIGN KEY (assigned_to) REFERENCES users(id))`,
  `CREATE TABLE IF NOT EXISTS payments (
    id INT AUTO_INCREMENT PRIMARY KEY, ref VARCHAR(30) UNIQUE, booking_id INT NOT NULL, customer_id INT NOT NULL, paid_at CHAR(10) NOT NULL,
    amount BIGINT NOT NULL, method VARCHAR(30) NOT NULL, reference VARCHAR(80), kind VARCHAR(10) NOT NULL DEFAULT 'Payment',
    status VARCHAR(10) NOT NULL DEFAULT 'Valid', remarks TEXT, user_id INT NULL, reversed_by INT NULL, reversed_reason TEXT,
    created_at VARCHAR(19) NOT NULL, INDEX ix_pay_bk (booking_id),
    CONSTRAINT ck_pay_amt CHECK (amount > 0), CONSTRAINT ck_pay_kind CHECK (kind IN ('Payment','Refund')), CONSTRAINT ck_pay_status CHECK (status IN ('Valid','Reversed')),
    FOREIGN KEY (booking_id) REFERENCES bookings(id), FOREIGN KEY (customer_id) REFERENCES customers(id), FOREIGN KEY (user_id) REFERENCES users(id))`,
  `CREATE TABLE IF NOT EXISTS expenses (
    id INT AUTO_INCREMENT PRIMARY KEY, spent_at CHAR(10) NOT NULL, category VARCHAR(40) NOT NULL, amount BIGINT NOT NULL, method VARCHAR(30),
    description TEXT, receipt VARCHAR(80), user_id INT NULL, status VARCHAR(10) NOT NULL DEFAULT 'Valid', void_reason TEXT,
    created_at VARCHAR(19) NOT NULL, CONSTRAINT ck_exp_amt CHECK (amount > 0), CONSTRAINT ck_exp_status CHECK (status IN ('Valid','Voided')),
    FOREIGN KEY (user_id) REFERENCES users(id))`,
  `CREATE TABLE IF NOT EXISTS documents (
    id INT AUTO_INCREMENT PRIMARY KEY, booking_id INT NOT NULL, stored VARCHAR(80) NOT NULL, original VARCHAR(200) NOT NULL,
    user_id INT NULL, at VARCHAR(19) NOT NULL, FOREIGN KEY (booking_id) REFERENCES bookings(id), FOREIGN KEY (user_id) REFERENCES users(id))`,
  `CREATE TABLE IF NOT EXISTS attendance (
    id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, day CHAR(10) NOT NULL, time_in VARCHAR(19), time_out VARCHAR(19),
    is_late TINYINT NOT NULL DEFAULT 0, late_min INT NOT NULL DEFAULT 0, UNIQUE KEY uq_att (user_id, day), FOREIGN KEY (user_id) REFERENCES users(id))`,
  `CREATE TABLE IF NOT EXISTS attendance_corrections (
    id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, day CHAR(10) NOT NULL, old_in VARCHAR(19), old_out VARCHAR(19),
    new_in VARCHAR(19), new_out VARCHAR(19), reason TEXT NOT NULL, by_user INT NOT NULL, at VARCHAR(19) NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS leaves (
    id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NULL, day CHAR(10) NOT NULL, kind VARCHAR(10) NOT NULL, note VARCHAR(200),
    UNIQUE KEY uq_leave (user_id, day, kind), CONSTRAINT ck_leave_kind CHECK (kind IN ('Leave','Holiday')))`,
  `CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY, at VARCHAR(19) NOT NULL, user_id INT NULL, username VARCHAR(40), action VARCHAR(60) NOT NULL,
    entity VARCHAR(30), entity_id VARCHAR(60), detail MEDIUMTEXT, ip VARCHAR(64), INDEX ix_audit_at (at))`,
  `CREATE TABLE IF NOT EXISTS messages (
    id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(120), email VARCHAR(160), phone VARCHAR(40), body TEXT, at VARCHAR(19) NOT NULL,
    handled TINYINT NOT NULL DEFAULT 0)`,
];

const DEFAULT_SETTINGS: Record<string, string> = {
  business_name: 'Alchemist Trip & Ride Travel Service',
  tagline: 'Your Travel Partner, One Click Away!',
  location: 'Puerto Princesa City, Palawan',
  phone: '', mobile: '0951 672 3814', email: '',
  address: 'Puerto Princesa City, Palawan',
  hours: '',
  facebook: '', facebook_name: 'Alchemist Trip&Ride Travel Service', instagram: '',
  about: 'Sa Alchemist Trip&Ride Travel Service, kasama mo kami mula booking hanggang biyahe.\n\nWe are a travel assistance service in Puerto Princesa City, Palawan. We help customers arrange domestic and international airline tickets, hotel reservations and other travel needs. Our team coordinates with airlines and suppliers on your behalf, so you get clear options and honest quotations.',
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
  for (const t of TABLES) await d.run(t);
  const have = new Set((await d.all<{ k: string }>('SELECT k FROM settings')).map((r) => r.k));
  for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) if (!have.has(k)) await d.run('INSERT INTO settings (k,v) VALUES (?,?)', [k, v]);
  if (!(await d.val('SELECT COUNT(*) FROM services'))) {
    for (const [i, s] of SERVICES.entries()) await d.run('INSERT INTO services (name,type,description,icon,sort) VALUES (?,?,?,?,?)', [...s, i]);
  }
  if (!(await d.val('SELECT COUNT(*) FROM users'))) {
    const pw = process.env.OWNER_PASSWORD || crypto.randomBytes(9).toString('base64url');
    await d.run(
      `INSERT INTO users (emp_no,name,username,password_hash,role,can_expenses,must_change_pw,created_at) VALUES ('EMP-0001','Owner','owner',?, 'owner',1,1,?)`,
      [await hashPassword(pw), now()],
    );
    console.log(`\n  First-run owner account created.\n  Username: owner\n  Password: ${pw}   (you will be asked to change it at first login)\n`);
  }
}
