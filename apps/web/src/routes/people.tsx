import type { RouteObject } from 'react-router-dom';
import AttendanceMonitor from '../pages/app/people/AttendanceMonitor';
import AttendanceReport from '../pages/app/people/AttendanceReport';
import EmployeeForm from '../pages/app/people/EmployeeForm';
import Employees from '../pages/app/people/Employees';
import MyAttendance from '../pages/app/people/MyAttendance';

// People slice: my attendance, employees, attendance monitoring and reports. Paths are relative to /app.
// The owner-only screens are protected by the API (403); the sidebar only links to them for owners.
export const peopleRoutes: RouteObject[] = [
  { path: 'attendance', element: <MyAttendance /> },
  { path: 'employees', element: <Employees /> },
  { path: 'employees/new', element: <EmployeeForm /> },
  { path: 'employees/:id', element: <EmployeeForm /> },
  { path: 'attendance-monitor', element: <AttendanceMonitor /> },
  { path: 'attendance-report', element: <AttendanceReport /> },
];
