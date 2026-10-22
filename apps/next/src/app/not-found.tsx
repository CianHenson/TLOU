import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="wrap"><div className="card" style={{ maxWidth: 520, margin: '60px auto', textAlign: 'center' }}>
      <h1>404</h1><p>Page not found.</p><Link className="btn" href="/">Back to home</Link>
    </div></div>
  );
}
