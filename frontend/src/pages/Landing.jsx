import { Link } from 'react-router-dom';
import { CheckCircle, Calendar, Zap, Layout, Shield, ArrowRight } from 'lucide-react';

export default function Landing({ token }) {
  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
      {/* Navbar */}
      <nav className="border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
           <div className="flex items-center gap-2">
               <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">A</div>
               <span className="text-xl font-bold tracking-tight">Antigravity</span>
           </div>
           <div className="flex items-center gap-4">
               {token ? (
                   <Link to="/dashboard" className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition">Go to Dashboard</Link>
               ) : (
                   <>
                       <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">Sign In</Link>
                       <Link to="/register" className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition">Get Started</Link>
                   </>
               )}
           </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-20 pb-32 overflow-hidden">
         <div className="max-w-6xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
             <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-6">
                    <Zap size={14} /> New: AI Task Scheduling
                </div>
                <h1 className="text-5xl lg:text-6xl font-extrabold text-slate-900 leading-[1.1] mb-6">
                    Organize your work <br/>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">with Intelligence.</span>
                </h1>
                <p className="text-lg text-slate-500 mb-8 leading-relaxed max-w-lg">
                    Stop drowning in tasks. Antigravity uses AI to prioritize, schedule, and manage your workload so you can focus on what matters.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                     {token ? (
                         <Link to="/dashboard" className="inline-flex justify-center items-center gap-2 px-8 py-3.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20">
                            Open Dashboard
                            <ArrowRight size={18} />
                         </Link>
                     ) : (
                        <Link to="/register" className="inline-flex justify-center items-center gap-2 px-8 py-3.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20">
                            Start for free
                            <ArrowRight size={18} />
                        </Link>
                     )}
                     <button className="inline-flex justify-center items-center gap-2 px-6 py-3.5 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-all">
                        View Demo
                     </button>
                </div>
                <div className="mt-8 flex items-center gap-4 text-sm text-slate-400">
                    <div className="flex -space-x-2">
                         {[1,2,3,4].map(i => (
                             <div key={i} className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white"></div>
                         ))}
                    </div>
                    <p>Trusted by 10,000+ planners</p>
                </div>
             </div>
             <div className="relative">
                 <div className="absolute -top-10 -right-10 w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl"></div>
                 <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 transform rotate-2 hover:rotate-0 transition-transform duration-500">
                     <img src="https://cdni.iconscout.com/illustration/premium/thumb/task-management-4517376-3742784.png?f=webp" alt="App Dashboard" className="rounded-xl w-full" />
                 </div>
             </div>
         </div>
      </section>

      {/* Features */}
      <section className="py-24 bg-slate-50">
          <div className="max-w-6xl mx-auto px-6">
              <div className="text-center max-w-2xl mx-auto mb-16">
                  <h2 className="text-3xl font-bold text-slate-900 mb-4">Everything you need to ship faster</h2>
                  <p className="text-slate-500">A simplistic yet powerful set of tools designed to help you and your team efficiently manage tasks and projects.</p>
              </div>

              <div className="grid md:grid-cols-3 gap-8">
                  {[
                      { icon: Layout, title: "Kanban & List Views", desc: "Visualize your work your way. Switch between list, board, and calendar views instantly." },
                      { icon: Shield, title: "Secure & Reliable", desc: "Enterprise-grade security with regular backups and encrypted data transmission." },
                      { icon: Calendar, title: "Smart Scheduling", desc: "Auto-schedule tasks based on priority and your available calendar slots." }
                  ].map((feature, idx) => (
                      <div key={idx} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                          <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 mb-6">
                              <feature.icon size={24} />
                          </div>
                          <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                          <p className="text-slate-500 leading-relaxed">{feature.desc}</p>
                      </div>
                  ))}
              </div>
          </div>
      </section>
      
      {/* Footer */}
      <footer className="bg-white py-12 border-t border-slate-100">
          <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-slate-900 rounded-md flex items-center justify-center text-white text-xs font-bold">A</div>
                  <span className="font-bold text-slate-900">Antigravity</span>
              </div>
              <p className="text-slate-400 text-sm">© 2024 Antigravity Inc. All rights reserved.</p>
          </div>
      </footer>
    </div>
  );
}
