import { Link } from 'react-router-dom';
import { ArrowRight, Calendar, CheckCircle, Layout, Shield, Sparkles, Zap } from 'lucide-react';
import InstallPWA from '../components/InstallPWA';

const featureCards = [
  {
    icon: Layout,
    title: 'Kanban & List Views',
    desc: 'Visualize your work your way. Switch between list, board, and calendar views instantly.',
  },
  {
    icon: Sparkles,
    title: 'Secure & Reliable',
    desc: 'Enterprise-grade security with regular backups and encrypted data transmission.',
  },
  {
    icon: Shield,
    title: 'Smart Scheduling',
    desc: 'Auto-schedule tasks based on priority and your available calendar slots.',
  },
];

export default function Landing({ token }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-transparent text-slate-900">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-28 top-20 h-80 w-80 rounded-full bg-aurora-300/45 blur-3xl animate-blob" />
        <div className="absolute right-0 top-0 h-[26rem] w-[26rem] rounded-full bg-primary-300/35 blur-3xl animate-blob" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-rosefire-300/35 blur-3xl animate-float" />
      </div>

      <nav className="fixed inset-x-0 top-0 z-50 px-3 sm:px-4">
        <div className="mx-auto mt-3 flex max-w-7xl items-center justify-between gap-3 rounded-[22px] border border-white/60 bg-white/62 px-3 py-3 shadow-[0_18px_60px_rgba(15,23,42,0.12)] backdrop-blur-2xl sm:mt-4 sm:rounded-[28px] sm:px-6 sm:py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-aurora-gradient text-lg font-black text-white">A</div>
            <div className="min-w-0">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">Task Manager</p>
              <p className="truncate text-base font-semibold text-slate-900 sm:text-lg">AI Personal Task Manager</p>
            </div>
          </div>

          <div className="flex flex-shrink-0 items-center gap-2 sm:gap-3">
            <InstallPWA className="hidden md:inline-flex" />
            {token ? (
              <Link
                to="/dashboard"
                className="rounded-2xl bg-slate-950 px-3 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-800 sm:px-5 sm:py-3"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link to="/login" className="hidden text-sm font-semibold text-slate-600 transition hover:text-slate-900 md:block">
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="rounded-2xl bg-aurora-gradient px-3 py-2.5 text-sm font-semibold text-white transition hover-glow sm:px-5 sm:py-3"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className="relative z-10 px-3 pb-16 pt-32 sm:px-6 sm:pb-20 sm:pt-36">
        <section className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="animate-fade-in">
            <div className="premium-chip mb-6">
              <Zap size={14} className="text-primary-500" />
              New: AI Task Scheduling
            </div>

            <h1 className="max-w-3xl text-4xl font-semibold leading-[1.05] text-slate-950 sm:text-5xl md:text-7xl">
              Organize your work
              <span className="text-gradient"> with Intelligence.</span>
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8 md:text-xl">
              Stop drowning in tasks. AI Personal Task Manager uses AI to prioritize, schedule, and manage your workload so you can focus on what matters.
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Link
                to={token ? '/dashboard' : '/register'}
                className="inline-flex items-center justify-center gap-2 rounded-[22px] bg-aurora-gradient px-7 py-4 text-base font-semibold text-white transition hover-glow"
              >
                {token ? 'Open Dashboard' : 'Start for free'}
                <ArrowRight size={18} />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 rounded-[22px] border border-white/70 bg-white/70 px-7 py-4 text-base font-semibold text-slate-700 shadow-sm backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white"
              >
                View Demo
              </Link>
              <InstallPWA className="px-7 py-4 text-base sm:hidden" />
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-3 text-sm text-slate-500">
              <span className="premium-chip">
                <CheckCircle size={14} className="text-emerald-500" />
                Trusted by 10,000+ planners
              </span>
              <span className="premium-chip">
                <Calendar size={14} className="text-aurora-500" />
                Smart scheduling and calendar sync
              </span>
            </div>
          </div>

          <div className="relative animate-slide-up">
            <div className="absolute inset-6 rounded-[34px] bg-gradient-to-br from-aurora-300/40 via-primary-300/25 to-rosefire-300/35 blur-3xl" />
            <div className="surface-card relative overflow-hidden p-3 sm:p-5">
              <div className="rounded-[22px] border border-white/70 bg-slate-950 px-3 py-4 text-white shadow-[0_30px_70px_rgba(3,7,18,0.4)] sm:rounded-[26px] sm:px-5">
                <div className="flex flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-[0.28em] text-white/45">Command Center</p>
                    <h2 className="mt-2 text-xl font-semibold sm:text-2xl">Organize your work with Intelligence.</h2>
                  </div>
                  <div className="w-fit rounded-2xl bg-white/10 px-3 py-2 text-sm text-white/70">AI Task Scheduling</div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-[1fr_0.78fr]">
                  <div className="rounded-[24px] border border-white/10 bg-white/6 p-4 backdrop-blur-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.25em] text-white/40">Today</p>
                        <p className="mt-2 text-lg font-semibold">Visualize your work your way.</p>
                      </div>
                      <div className="rounded-2xl bg-gradient-to-br from-aurora-500 to-primary-500 px-4 py-2 text-sm font-semibold shadow-[0_18px_40px_rgba(95,120,246,0.28)]">
                        Active
                      </div>
                    </div>

                    <div className="mt-5 space-y-3">
                      {[
                        ['Kanban & List Views', 'Switch between list, board, and calendar views instantly.', 'bg-emerald-400/15 text-emerald-200'],
                        ['Secure & Reliable', 'Enterprise-grade security with regular backups.', 'bg-aurora-400/15 text-aurora-100'],
                        ['Smart Scheduling', 'Auto-schedule tasks based on priority.', 'bg-primary-400/15 text-primary-100'],
                      ].map(([title, time, colors]) => (
                        <div key={title} className="flex flex-col gap-3 rounded-2xl border border-white/8 bg-white/6 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <p className="font-medium text-white">{title}</p>
                            <p className="mt-1 text-xs text-white/45">{time}</p>
                          </div>
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${colors}`}>Ready</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-[24px] border border-white/10 bg-white/8 p-4 backdrop-blur-xl">
                      <p className="text-xs uppercase tracking-[0.25em] text-white/40">Assistant</p>
                      <p className="mt-3 rounded-2xl bg-white/8 px-4 py-3 text-sm leading-6 text-white/80">
                        "AI Personal Task Manager uses AI to prioritize, schedule, and manage your workload."
                      </p>
                    </div>
                    <div className="rounded-[24px] border border-white/10 bg-gradient-to-br from-white/12 to-white/4 p-4 backdrop-blur-xl">
                      <p className="text-xs uppercase tracking-[0.25em] text-white/40">Connected Tools</p>
                      <div className="mt-4 grid gap-3">
                        {['Trusted by 10,000+ planners', 'Secure & Reliable', 'Smart Scheduling'].map((item) => (
                          <div key={item} className="flex items-center gap-3 rounded-2xl bg-white/6 px-3 py-3 text-sm text-white/80">
                            <span className="h-2.5 w-2.5 rounded-full bg-primary-300 animate-pulse-glow" />
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto mt-24 max-w-7xl">
          <div className="mb-10 max-w-2xl">
            <div className="premium-chip mb-5">Features</div>
            <h2 className="text-4xl font-semibold text-slate-950 md:text-5xl">
              Everything you need to ship faster
            </h2>
            <p className="mt-4 text-slate-500">
              A simplistic yet powerful set of tools designed to help you and your team efficiently manage tasks and projects.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {featureCards.map((feature) => (
              <div key={feature.title} className="surface-card group p-8 transition duration-300 hover:-translate-y-1.5">
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-aurora-100 via-white to-primary-100 text-slate-900 shadow-inner">
                  <feature.icon size={24} />
                </div>
                <h3 className="text-2xl font-semibold text-slate-900">{feature.title}</h3>
                <p className="mt-4 text-base leading-7 text-slate-600">{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/50 bg-white/50 py-10 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 text-sm text-slate-500 md:flex-row">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-950 text-sm font-bold text-white">A</div>
            <span className="font-medium text-slate-700">AI Personal Task Manager</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            <Link to="/privacy-policy" className="transition hover:text-slate-900">Privacy Policy</Link>
            <Link to="/terms-of-service" className="transition hover:text-slate-900">Terms</Link>
            <Link to="/data-deletion" className="transition hover:text-slate-900">Data Deletion</Link>
          </div>
          <p>© 2026 AI Personal Task Manager. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
