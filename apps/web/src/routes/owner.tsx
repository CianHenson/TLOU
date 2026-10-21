import type { RouteObject } from 'react-router-dom';
import Audit from '../pages/app/owner/Audit';
import Dashboard from '../pages/app/owner/Dashboard';
import Finance from '../pages/app/owner/Finance';
import Services from '../pages/app/owner/Services';
import Settings from '../pages/app/owner/Settings';

// Owner/system slice: dashboards, finance, services, content, audit, settings. Paths are relative to /app.
// (The API rejects employees on the owner-only ones with 403.)
export const ownerRoutes: RouteObject[] = [
  { index: true, element: <Dashboard /> },
  { path: 'finance', element: <Finance /> },
  { path: 'services', element: <Services /> },
  { path: 'content', element: <Settings mode="content" /> },
  { path: 'settings', element: <Settings mode="system" /> },
  { path: 'audit', element: <Audit /> },
];
