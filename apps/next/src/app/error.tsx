'use client';

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="wrap"><div className="card" style={{ maxWidth: 520, margin: '60px auto', textAlign: 'center' }}>
      <h1>Something went wrong</h1><p>Please try again.</p><button className="btn" onClick={reset}>Retry</button>
    </div></div>
  );
}
