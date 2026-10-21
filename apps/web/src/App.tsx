import { Link, Navigate, useRoutes, type RouteObject } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
import PublicLayout from './layouts/PublicLayout';
import { useAuth } from './lib/auth';
import Home from './pages/public/Home';
import { About, Privacy, Services } from './pages/public/InfoPages';
import Login from './pages/public/Login';
import { RequestDone, RequestForm } from './pages/public/RequestForm';
import { coreRoutes } from './routes/core';
import { ownerRoutes } from './routes/owner';
import { peopleRoutes } from './routes/people';

function RequireAuth({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) return <p className="muted" style={{ padding: 32 }}>Loading…</p>;
  return user ? children : <Navigate to="/login" replace />;
}

function NotFound() {
  return (
    <div className="wrap"><div className="narrow card" style={{ textAlign: 'center' }}>
      <h1>404</h1><p>Page not found.</p><Link className="btn" to="/">Back to home</Link>
    </div></div>
  );
}

const routes: RouteObject[] = [
  {
    element: <PublicLayout />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/about', element: <About /> },
      { path: '/services', element: <Services /> },
      { path: '/privacy', element: <Privacy /> },
      { path: '/contact', element: <Navigate to="/#contact" replace /> },
      { path: '/request', element: <RequestForm /> },
      { path: '/request/done', element: <RequestDone /> },
      { path: '/login', element: <Login /> },
    ],
  },
  {
    path: '/app',
    element: <RequireAuth><AppLayout /></RequireAuth>,
    children: [...ownerRoutes, ...coreRoutes, ...peopleRoutes],
  },
  { path: '*', element: <PublicLayout />, children: [{ path: '*', element: <NotFound /> }] },
];

export default function App() {
  return useRoutes(routes);
}
