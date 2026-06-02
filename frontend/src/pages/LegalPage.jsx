import { Link } from 'react-router-dom';

export default function LegalPage({ title, subtitle, updatedAt, children }) {
  return (
    <div className="min-h-screen bg-transparent px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <nav className="mb-8 flex items-center justify-between gap-4">
          <Link to="/" className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-aurora-gradient text-base font-black text-white">
              A
            </div>
            <span className="truncate text-sm font-semibold text-slate-700 sm:text-base">
              AI Personal Task Manager
            </span>
          </Link>
          <Link
            to="/"
            className="rounded-2xl border border-white/70 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur-xl transition hover:bg-white"
          >
            Home
          </Link>
        </nav>

        <main className="surface-card p-6 sm:p-8 lg:p-10">
          <header className="border-b border-slate-200/70 pb-6">
            <p className="premium-chip mb-4">Legal</p>
            <h1 className="text-3xl font-semibold text-slate-950 sm:text-4xl">{title}</h1>
            <p className="mt-3 text-base leading-7 text-slate-600">{subtitle}</p>
            <p className="mt-4 text-sm text-slate-500">Last updated: {updatedAt}</p>
          </header>

          <div className="mt-8 space-y-7 text-slate-700 [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-slate-950 [&_p]:text-base [&_p]:leading-7 [&_p]:text-slate-600">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
