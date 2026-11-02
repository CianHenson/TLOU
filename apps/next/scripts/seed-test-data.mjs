// Development test data: WIPES every record (keeps the owner login, website settings and website services) and loads
// realistic sample data, at least 10 rows per module. Never run this against a production database.
// Run from apps/next:  npm run seed:test      (stop nothing: the app can stay running)
// Staff / admin logins created here all use the password  Staff12345
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import mysql from 'mysql2/promise';

if (process.env.NODE_ENV === 'production') { console.error('Refusing to seed a production database.'); process.exit(1); }

const PASSWORD = 'Staff12345';
const hashPw = (pw) => {
  const salt = crypto.randomBytes(16);
  return `scrypt$${salt.toString('hex')}$${crypto.scryptSync(pw.normalize(), salt, 64, { N: 16384, r: 8, p: 1 }).toString('hex')}`;
};
// Small deterministic random generator so every run produces the same data.
let seed = 20261102;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const pick = (a) => a[Math.floor(rnd() * a.length)];
const between = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));
const pad = (n, w = 2) => String(n).padStart(w, '0');
const peso = (n) => Math.round(n * 100); // pesos -> centavos
const addDays = (d, n) => { const t = new Date(d + 'T00:00:00Z'); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };
const dow = (d) => new Date(d + 'T00:00:00Z').getUTCDay();
const hm = (m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}:00`;

const db = await mysql.createConnection({
  host: process.env.DB_HOST || '127.0.0.1', port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || '', database: process.env.DB_NAME || 'tcaps',
});
const run = async (sql, p = []) => (await db.query(sql, p))[0];
const ins = async (sql, p) => (await run(sql, p)).insertId;
const TODAY = '2026-11-02';
const NOW = `${TODAY} 08:00:00`;

try {
  const owner = (await run("SELECT id, signature FROM users WHERE role='owner' ORDER BY id LIMIT 1"))[0];
  if (!owner) throw new Error('No owner account found. Start the app once (or run npm run seed) first.');

  // ---------- wipe ----------
  await run('SET FOREIGN_KEY_CHECKS=0');
  for (const t of ['payroll_deductions', 'payroll', 'deduction_rates', 'deductions', 'attendance_correction_requests', 'attendance_corrections', 'attendance',
    'leave_requests', 'leaves', 'employees', 'airfare_sales', 'airlines', 'trash', 'request_log', 'notes', 'requests',
    'expenses', 'customers', 'messages', 'audit_logs']) await run(`TRUNCATE TABLE ${t}`);
  await run("DELETE FROM users WHERE role<>'owner'");
  await run('SET FOREIGN_KEY_CHECKS=1');
  const uploads = path.join(process.cwd(), 'data', 'uploads');
  if (fs.existsSync(uploads)) for (const f of fs.readdirSync(uploads)) if (f !== owner.signature) fs.rmSync(path.join(uploads, f), { force: true });

  // ---------- users + employees (10 staff, 1 admin) ----------
  const people = [
    ['Cris', 'Beliran', 'judave@gmail.com', 'Travel Consultant', 135], ['Maria', 'Santos', 'maria.santos', 'Ticketing Officer', 120],
    ['Jose', 'Ramirez', 'jose.ramirez', 'Reservations Agent', 110], ['Angela', 'Reyes', 'angela.reyes', 'Customer Service', 105],
    ['Mark', 'Dela Pena', 'mark.delapena', 'Travel Consultant', 130], ['Joanna', 'Cruz', 'joanna.cruz', 'Accounting Staff', 125],
    ['Paolo', 'Villanueva', 'paolo.villanueva', 'Tour Coordinator', 100], ['Katrina', 'Mendoza', 'katrina.mendoza', 'Ticketing Officer', 115],
    ['Ramon', 'Aquino', 'ramon.aquino', 'Driver / Dispatcher', 90], ['Liza', 'Bautista', 'liza.bautista', 'Front Desk', 95],
  ];
  const staff = [];
  for (const [i, [first, last, username, designation, rate]] of people.entries()) {
    const id = await ins(`INSERT INTO users (emp_no,name,first_name,last_name,email,username,password_hash,role,designation,active,can_expenses,must_change_pw,created_at)
      VALUES (?,?,?,?,?,?,?,'employee',?,1,?,0,?)`, [`EMP-${pad(i + 2, 4)}`, `${first} ${last}`, first, last,
      username.includes('@') ? username : `${username}@alchemisttravel.test`, username, hashPw(PASSWORD), designation, i === 5 ? 1 : 0, NOW]);
    await run('INSERT INTO employees (user_id,hourly_rate,active,created_by,created_at) VALUES (?,?,1,?,?)', [id, peso(rate), owner.id, NOW]);
    staff.push({ id, name: `${first} ${last}`, rate: peso(rate), empId: (await run('SELECT id FROM employees WHERE user_id=?', [id]))[0].id });
  }
  const adminId = await ins(`INSERT INTO users (emp_no,name,first_name,last_name,email,username,password_hash,role,designation,active,can_expenses,must_change_pw,created_at)
    VALUES ('EMP-0012','Rhea Villanueva','Rhea','Villanueva','rhea.villanueva@alchemisttravel.test','rhea.admin',?,'admin','Operations Manager',1,1,0,?)`, [hashPw(PASSWORD), NOW]);

  // ---------- customers (12) ----------
  const custs = [
    ['Eduardo Manalo', '0917 345 8821', 'eduardo.manalo@gmail.com', 'Viber'], ['Teresita Gonzales', '0928 410 7765', 'tess.gonzales@yahoo.com', 'Phone call'],
    ['Ricardo Alvarez', '0939 221 4408', 'ricky.alvarez@gmail.com', 'Messenger'], ['Lorna Fernandez', '0945 118 3092', 'lorna.fernandez@gmail.com', 'SMS'],
    ['Benjamin Ocampo', '0918 776 5530', 'ben.ocampo@outlook.com', 'Email'], ['Cecilia Domingo', '0956 903 1147', 'cecil.domingo@gmail.com', 'Viber'],
    ['Alfredo Navarro', '0927 664 2085', 'fred.navarro@gmail.com', 'Phone call'], ['Marites Soriano', '0935 508 7719', 'marites.soriano@gmail.com', 'Messenger'],
    ['Gregorio Padilla', '0949 372 6604', 'greg.padilla@yahoo.com', 'WhatsApp'], ['Nenita Castillo', '0916 285 9931', 'nenita.castillo@gmail.com', 'SMS'],
    ['Ernesto Magbanua', '0998 147 3356', 'ernie.magbanua@gmail.com', 'Phone call'], ['Rosalinda Tan', '0961 820 4472', 'rosalinda.tan@gmail.com', 'Email'],
  ];
  const cust = [];
  for (const [i, [name, phone, email, pref]] of custs.entries()) {
    const id = await ins('INSERT INTO customers (code,name,phone,email,pref_contact,notes,created_at) VALUES (?,?,?,?,?,?,?)',
      [`CUST-${pad(i + 1, 5)}`, name, phone, email, pref, i % 3 === 0 ? 'Repeat customer. Prefers morning flights.' : null, `2026-0${between(8, 9)}-${pad(between(1, 28))} 10:15:00`]);
    cust.push({ id, name });
  }

  // ---------- expenses (12) ----------
  const E = [
    ['Operational', 'Office electricity bill, October', 6850, 'Bank transfer'], ['Operational', 'Internet subscription, October', 2499, 'GCash'],
    ['Staff & Payroll', 'Staff meal allowance, October', 4200, 'Cash'], ['Marketing & Advertising', 'Facebook page ads', 3000, 'Credit/debit card'],
    ['Ticketing & Booking', 'Airline GDS access fee', 5500, 'Bank transfer'], ['Transportation & Vehicle', 'Fuel for office van', 3250, 'Cash'],
    ['Administrative & Legal', 'Business permit renewal', 8400, 'Cash'], ['Insurance & Risk', 'Office fire insurance premium', 12000, 'Bank transfer'],
    ['Miscellaneous', 'Office supplies: paper, ink, folders', 1780, 'Cash'], ['Operational', 'Water and cleaning supplies', 950, 'Cash'],
    ['Marketing & Advertising', 'Printed flyers and tarpaulin', 2600, 'GCash'], ['Miscellaneous', 'Duplicate purchase of printer ink', 1200, 'Cash'],
  ];
  for (const [i, [cat, desc, amt, method]] of E.entries()) {
    const date = `2026-10-${pad(2 + i * 2)}`, voided = i === 11;
    await run('INSERT INTO expenses (spent_at,category,amount,method,description,user_id,status,void_reason,created_at) VALUES (?,?,?,?,?,?,?,?,?)',
      [date, cat, peso(amt), method, desc, i % 2 ? adminId : owner.id, voided ? 'Voided' : 'Valid', voided ? 'Entered twice' : null, `${date} 16:00:00`]);
  }

  // ---------- airlines (11) ----------
  const AL = [['Philippine Airlines', 'PR'], ['Cebu Pacific', '5J'], ['AirAsia', 'Z2'], ['Royal Air', null], ['Airswift', 'T6'], ['Sunlight Air', null],
    ['PAL Express', '2P'], ['Cebgo', 'DG'], ['Singapore Airlines', 'SQ'], ['Cathay Pacific', 'CX'], ['Jetstar Asia', '3K']];
  for (const [name, code] of AL) await run('INSERT INTO airlines (name,code,active,created_by,created_at) VALUES (?,?,1,?,?)', [name, code, owner.id, NOW]);

  // ---------- airfare sales (12) ----------
  const F = [ // airline, passenger, pax, origin, destination, travel date, time, flight, fare, charge, cardfee, status
    ['Cebu Pacific', 'Eduardo Manalo', 1, 'Puerto Princesa', 'Manila', '2026-11-14', '06:20', '5J 752', 3250, 300, 0, 'Pending'],
    ['Philippine Airlines', 'Teresita Gonzales', 2, 'Manila', 'Puerto Princesa', '2026-11-20', '09:45', 'PR 2043', 6400, 400, 160, 'Pending'],
    ['AirAsia', 'Ricardo Alvarez', 1, 'Puerto Princesa', 'Cebu', '2026-11-08', '13:10', 'Z2 322', 2750, 250, 0, 'Done'],
    ['Cebu Pacific', 'Lorna Fernandez', 3, 'Cebu', 'Puerto Princesa', '2026-11-25', '07:30', '5J 548', 8700, 600, 220, 'Pending'],
    ['Philippine Airlines', 'Benjamin Ocampo', 1, 'Puerto Princesa', 'Manila', '2026-10-30', '15:00', 'PR 2046', 4100, 300, 0, 'Done'],
    ['Cebu Pacific', 'Cecilia Domingo', 2, 'Puerto Princesa', 'Iloilo', '2026-11-12', '11:25', '5J 314', 4650, 400, 0, 'Pending'],
    ['AirAsia', 'Alfredo Navarro', 1, 'Manila', 'Puerto Princesa', '2026-10-28', '05:55', 'Z2 819', 2900, 250, 0, 'Done'],
    ['Cebgo', 'Marites Soriano', 2, 'Puerto Princesa', 'Cagayan de Oro', '2026-12-02', '10:40', 'DG 6532', 5200, 400, 130, 'Pending'],
    ['PAL Express', 'Gregorio Padilla', 1, 'Puerto Princesa', 'Cebu', '2026-11-18', '16:20', '2P 2518', 3050, 250, 0, 'Rebooked'],
    ['Cebu Pacific', 'Nenita Castillo', 4, 'Manila', 'Puerto Princesa', '2026-12-19', '08:05', '5J 749', 13800, 800, 350, 'Pending'],
    ['AirAsia', 'Ernesto Magbanua', 1, 'Puerto Princesa', 'Manila', '2026-10-22', '12:00', 'Z2 614', 3300, 300, 0, 'No-show'],
    ['Philippine Airlines', 'Rosalinda Tan', 2, 'Puerto Princesa', 'Manila', '2026-11-30', '18:15', 'PR 2049', 8900, 500, 220, 'Pending'],
  ];
  for (const [i, [airline, pax_name, pax, origin, dest, tdate, ttime, flight, fare, charge, card, status]] of F.entries()) {
    const txn = `2026-10-${pad(between(1, 29))}`;
    await run(`INSERT INTO airfare_sales (txn_date,airline,pnr,pax,passenger,contact,email_fb,origin,destination,travel_date,travel_time,checkin_status,flight_no,total_amount,service_charge,card_fee,remarks,user_id,created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [txn, airline, crypto.randomBytes(3).toString('hex').toUpperCase(), pax, pax_name, custs[i % custs.length][1], custs[i % custs.length][2],
      origin, dest, tdate, ttime, status, flight, peso(fare + charge), peso(charge), peso(card), status === 'Rebooked' ? 'Moved to a later flight' : null, staff[i % staff.length].id, `${txn} 11:00:00`]);
  }

  // ---------- holidays, leave requests, leaves ----------
  const H = [['2026-08-21', 'Ninoy Aquino Day'], ['2026-08-31', 'National Heroes Day'], ['2026-10-31', 'All Saints Day eve'], ['2026-11-01', 'All Saints Day'],
    ['2026-11-30', 'Bonifacio Day'], ['2026-12-08', 'Feast of the Immaculate Conception'], ['2026-12-24', 'Christmas Eve'], ['2026-12-25', 'Christmas Day'],
    ['2026-12-30', 'Rizal Day'], ['2026-12-31', 'New Year\'s Eve']];
  for (const [day, note] of H) await run("INSERT INTO leaves (user_id,day,kind,note) VALUES (NULL,?,'Holiday',?)", [day, note]);
  const holidays = new Set(H.map((h) => h[0]));
  const LR = [ // staff idx, kind, from, to, reason, status, decline reason
    [0, 'Vacation leave', '2026-10-12', '2026-10-13', 'Family trip to Iloilo.', 'Approved'], [1, 'Sick leave', '2026-10-06', '2026-10-06', 'Fever and cough, with medical certificate.', 'Approved'],
    [2, 'Day off', '2026-10-20', '2026-10-20', 'Personal errand at the city hall.', 'Approved'], [3, 'Emergency leave', '2026-10-15', '2026-10-15', 'Family emergency.', 'Approved'],
    [4, 'Vacation leave', '2026-11-16', '2026-11-18', 'Attending a relative\'s wedding in Cebu.', 'Pending'], [5, 'Sick leave', '2026-11-05', '2026-11-05', 'Dental surgery.', 'Pending'],
    [6, 'Day off', '2026-11-09', '2026-11-09', 'Renewing driver\'s license.', 'Pending'], [7, 'Vacation leave', '2026-12-26', '2026-12-29', 'Christmas break with family.', 'Pending'],
    [8, 'Day off', '2026-10-27', '2026-10-27', 'Moving to a new house.', 'Declined', 'Too many staff on leave that day.'],
    [9, 'Vacation leave', '2026-11-23', '2026-11-27', 'Out of town trip.', 'Declined', 'Peak booking week, please file another date.'],
  ];
  const leaveDays = new Set(); // "userId|day" of approved leave, so those days get no attendance
  for (const [si, kind, from, to, reason, status, decline] of LR) {
    const u = staff[si];
    await run('INSERT INTO leave_requests (user_id,kind,from_day,to_day,reason,status,decline_reason,created_at,reviewed_by,reviewed_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
      [u.id, kind, from, to, reason, status, decline ?? null, `${addDays(from, -7)} 09:00:00`, status === 'Pending' ? null : owner.id, status === 'Pending' ? null : `${addDays(from, -5)} 10:00:00`]);
    if (status === 'Approved') for (let d = from; d <= to; d = addDays(d, 1)) if (dow(d) >= 1 && dow(d) <= 5) {
      await run("INSERT IGNORE INTO leaves (user_id,day,kind,note) VALUES (?,?,'Leave',?)", [u.id, d, kind]); leaveDays.add(`${u.id}|${d}`);
    }
  }

  // ---------- attendance: every weekday of October 2026 (today stays empty so Time In can be tested) ----------
  const att = {}; // `${userId}` -> [{day, mins}]
  for (const u of staff) {
    att[u.id] = [];
    for (let d = '2026-10-01'; d <= '2026-10-30'; d = addDays(d, 1)) {
      if (dow(d) === 0 || dow(d) === 6 || holidays.has(d) || leaveDays.has(`${u.id}|${d}`) || rnd() < 0.04) continue;
      const late = rnd() < 0.18, tin = late ? between(8 * 60 + 12, 8 * 60 + 40) : between(7 * 60 + 45, 8 * 60 + 8);
      const bout = between(12 * 60, 12 * 60 + 15), bin = bout + between(45, 60), tout = between(17 * 60, 17 * 60 + 35);
      const lateMin = tin - 8 * 60;
      await run('INSERT INTO attendance (user_id,day,time_in,break_out,break_in,time_out,is_late,late_min) VALUES (?,?,?,?,?,?,?,?)',
        [u.id, d, `${d} ${hm(tin)}`, `${d} ${hm(bout)}`, `${d} ${hm(bin)}`, `${d} ${hm(tout)}`, lateMin > 10 ? 1 : 0, lateMin > 10 ? lateMin : 0]);
      att[u.id].push({ day: d, mins: tout - tin - (bin - bout) });
    }
  }

  // ---------- attendance correction requests (10) ----------
  const CR = [
    [0, '2026-10-05', [['time_in', '08:00']], 'Forgot to tap Time In, I arrived at 8:00.', 'Pending'], [1, '2026-10-07', [['time_out', '17:30']], 'System logged me out early.', 'Pending'],
    [2, '2026-10-08', [['break_in', '13:00']], 'Forgot to press Break In.', 'Pending'], [3, '2026-10-09', [['time_in', '07:55'], ['time_out', '17:05']], 'Phone location was off in the morning.', 'Approved'],
    [4, '2026-10-12', [['status', 'Present']], 'Marked late but I was already at the office.', 'Approved'], [5, '2026-10-13', [['break_out', '12:00']], 'Break Out was not recorded.', 'Approved'],
    [6, '2026-10-14', [['time_out', '18:00']], 'Stayed to finish a rush booking.', 'Declined', 'Overtime needs prior approval.'],
    [7, '2026-10-15', [['time_in', '07:45']], 'Early arrival not recorded.', 'Declined', 'No supporting proof of arrival.'],
    [8, '2026-10-19', [['time_in', '08:05'], ['break_out', '12:05']], 'Network issue when I clocked in.', 'Approved'], [9, '2026-10-21', [['time_out', '17:00']], 'Forgot to press Time Out.', 'Pending'],
  ];
  for (const [si, day, ch, reason, status, decline] of CR) await run(
    'INSERT INTO attendance_correction_requests (user_id,day,changes,reason,status,decline_reason,created_at,reviewed_by,reviewed_at) VALUES (?,?,?,?,?,?,?,?,?)',
    [staff[si].id, day, JSON.stringify(ch.map(([field, value]) => ({ field, value }))), reason, status, decline ?? null, `${day} 18:00:00`,
      status === 'Pending' ? null : owner.id, status === 'Pending' ? null : `${addDays(day, 1)} 09:00:00`]);

  // ---------- deductions (10) with rates, and payroll (10, Oct 1-14) ----------
  const D = [['SSS contribution', 450], ['PhilHealth contribution', 250], ['Pag-IBIG contribution', 200], ['Withholding tax', 500], ['Union dues', 100],
    ['Health insurance (HMO)', 150], ['Company loan', 300], ['Cash advance', 200], ['Uniform deduction', 50], ['Meal plan', 100]];
  const ded = [];
  for (const [name, bp] of D) {
    const id = await ins("INSERT INTO deductions (name,kind,basis,created_by,created_at) VALUES (?,'percent','gross',?,?)", [name, owner.id, NOW]);
    await run('INSERT INTO deduction_rates (deduction_id,rate_bp,active,effective_from,changed_by,changed_at) VALUES (?,?,1,?,?,?)', [id, bp, '2026-01-01', owner.id, NOW]);
    ded.push({ id, name, bp });
  }
  for (const u of staff) {
    const rows = att[u.id].filter((r) => r.day <= '2026-10-14'), minutes = rows.reduce((a, r) => a + r.mins, 0);
    const basic = Math.round((minutes / 60) * u.rate), adj = u.id % 3 === 0 ? peso(500) : 0, gross = basic + adj;
    const lines = ded.slice(0, 3).map((d) => ({ ...d, amount: Math.round((gross * d.bp) / 10000) })), totalDed = lines.reduce((a, l) => a + l.amount, 0);
    const pid = await ins(`INSERT INTO payroll (employee_id,user_id,period_kind,period_from,period_to,days,minutes,incomplete,hourly_rate,basic_pay,adjustments,adjustment_note,gross_pay,total_deductions,net_pay,created_by,created_at)
      VALUES (?,?,?,?,?,?,?,0,?,?,?,?,?,?,?,?,?)`, [u.empId, u.id, 'Biweekly', '2026-10-01', '2026-10-14', rows.length, minutes, u.rate, basic, adj, adj ? 'Performance incentive' : null, gross, totalDed, gross - totalDed, owner.id, '2026-10-15 09:00:00']);
    for (const l of lines) await run('INSERT INTO payroll_deductions (payroll_id,deduction_id,name,kind,rate_bp,basis_amount,amount) VALUES (?,?,?,?,?,?,?)', [pid, l.id, l.name, 'percent', l.bp, gross, l.amount]);
  }

  // ---------- website services (up to 10) and contact messages (10) ----------
  const have = (await run('SELECT COUNT(*) n FROM services'))[0].n;
  const extra = [['Visa Assistance', 'Other travel service', 'Guidance on visa requirements and document checklists.', '🛂'], ['Travel Insurance', 'Other travel service', 'Coverage for medical, baggage and trip delays.', '🛡️'],
    ['Van and Car Rental', 'Other travel service', 'Airport transfers and island tours with a driver.', '🚐'], ['Island Hopping Tours', 'Travel package', 'Honda Bay, Underground River and El Nido tours.', '🏝️']];
  for (const [i, s] of extra.entries()) if (have + i < 10) await run('INSERT INTO services (name,type,description,icon,sort) VALUES (?,?,?,?,?)', [...s, have + i]);
  const M = [
    ['Eduardo Manalo', 'Hello, how much is a flight from Puerto Princesa to Manila on 14 November?'], ['Teresita Gonzales', 'Can you help me book a hotel in El Nido for 5 to 8 December?'],
    ['Ricardo Alvarez', 'Do you offer package tours for a group of 15?'], ['Lorna Fernandez', 'I need to rebook my Cebu flight, who should I contact?'],
    ['Benjamin Ocampo', 'Are you open on Sundays?'], ['Cecilia Domingo', 'Looking for a van rental with driver for 8 people on 9 November.'],
    ['Alfredo Navarro', 'Do you handle visa assistance for Singapore?'], ['Marites Soriano', 'Please send a quotation for 2 tickets to Cagayan de Oro in December.'],
    ['Gregorio Padilla', 'Can I pay using GCash?'], ['Nenita Castillo', 'Thank you for the great service on our last trip!'],
  ];
  for (const [i, [name, body]] of M.entries()) await run('INSERT INTO messages (name,email,phone,body,at,handled) VALUES (?,?,?,?,?,?)',
    [name, custs[i][2], custs[i][1], body, `2026-10-${pad(10 + i)} 15:20:00`, i < 4 ? 1 : 0]);

  // ---------- summary ----------
  for (const t of ['users', 'employees', 'customers', 'expenses', 'airlines', 'airfare_sales', 'leaves', 'leave_requests', 'attendance',
    'attendance_correction_requests', 'deductions', 'payroll', 'services', 'messages']) console.log(t.padEnd(32), (await run(`SELECT COUNT(*) n FROM ${t}`))[0].n);
  console.log(`\nLogins: staff usernames above / rhea.admin / password ${PASSWORD}. The owner login is unchanged.`);
} finally { await db.end(); }
