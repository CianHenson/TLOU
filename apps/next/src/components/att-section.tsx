'use client';
// Attendance & Payroll: the section switcher (Attendance / Employees / Payroll) as a dropdown at the start of the
// table toolbar. Switching drops the current section's filters.
import { useRouter } from 'next/navigation';
import { Dropdown } from './dropdown';

const SECTIONS: [string, string][] = [['attendance', 'Attendance'], ['employees', 'Employees'], ['payroll', 'Payroll']];

export function SectionSelect({ value }: { value: string }) {
  const router = useRouter();
  return (
    <Dropdown ariaLabel="Section" value={value} options={SECTIONS} className="dd-section"
      onChange={(v) => router.push(`/app/attendance-monitor${v === 'attendance' ? '' : `?tab=${v}`}`)} />
  );
}
