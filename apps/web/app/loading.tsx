export default function Loading() {
  return (
    <main className="page narrow" aria-busy="true">
      <span className="eyebrow">GETTING YOUR CONNECTION READY</span>
      <div className="loading-line" />
      <p className="help" role="status">
        One moment, please.
      </p>
    </main>
  );
}
