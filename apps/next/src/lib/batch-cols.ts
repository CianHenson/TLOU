// Column definitions for the CSV Batch Upload on Airfare Sales and Monitoring Finances / Expenses (client and server).
import type { CsvColumn } from './csv';

export const AIRFARE_COLS: CsvColumn[] = [
  { key: 'txn_date', label: 'Transaction Date', required: true, aliases: ['Date'], example: '2026-10-30' },
  { key: 'airline', label: 'Airline', required: true, example: 'Cebu Pacific' },
  { key: 'pnr', label: 'PNR', required: true, example: 'AB12CD' },
  { key: 'pax', label: 'PAX', required: true, example: '1' },
  { key: 'passenger', label: 'Passenger', required: true, example: 'Juan Dela Cruz' },
  { key: 'contact', label: 'Contact', example: '09171234567' },
  { key: 'email_fb', label: 'Email/Facebook', example: 'juan@example.com' },
  { key: 'origin', label: 'Origin', required: true, example: 'Puerto Princesa' },
  { key: 'destination', label: 'Destination', required: true, example: 'Manila' },
  { key: 'travel_date', label: 'Travel Date', required: true, example: '2026-11-15' },
  { key: 'travel_time', label: 'Travel Time', example: '8:30 AM' },
  { key: 'checkin_status', label: 'Check-in Status', example: 'Pending' },
  { key: 'flight_no', label: 'Flight No', example: '5J 123' },
  { key: 'total_amount', label: 'Total Amount', required: true, example: '3500.00' },
  { key: 'service_charge', label: 'Service Charge', example: '300.00' },
  { key: 'card_fee', label: 'Card Fee', example: '0' },
  { key: 'remarks', label: 'Remarks', example: '' },
];

export const EXPENSE_COLS: CsvColumn[] = [
  { key: 'spent_at', label: 'Date', required: true, aliases: ['Expense Date'], example: '2026-10-30' },
  { key: 'category', label: 'Type of Expense', required: true, aliases: ['Category'], example: 'Operational' },
  { key: 'amount', label: 'Amount', required: true, example: '1250.00' },
  { key: 'method', label: 'Payment Method', required: true, aliases: ['Method'], example: 'Cash' },
  { key: 'description', label: 'Description', required: true, aliases: ['Remarks'], example: 'Office supplies' },
];
