import React, { useEffect, useState } from 'react';
import { 
  Activity, ShieldAlert, Server, Trash2, Plus, 
  RefreshCw, Search, ShieldCheck, Zap
} from 'lucide-react';
import { format } from 'date-fns';

export default function App() {
  const [stats, setStats] = useState({ totalRequests: 0, blockedRequests: 0, blockRate: 0, avgLatency: 0 });
  const [logs, setLogs] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [policies, setPolicies] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const [activeView, setActiveView] = useState('dashboard'); 
  const [searchQuery, setSearchQuery] = useState('');
  const [auditSearchQuery, setAuditSearchQuery] = useState('');

  // New Policy Form State
  const [showPolicyForm, setShowPolicyForm] = useState(false);
  const [newPolicyType, setNewPolicyType] = useState('block');
  const [newPolicyTarget, setNewPolicyTarget] = useState('ip');
  const [newPolicyLimit, setNewPolicyLimit] = useState('');
  const [newPolicyWindow, setNewPolicyWindow] = useState('');
  const [newPolicyBurst, setNewPolicyBurst] = useState('');
  const [newPolicyMatch, setNewPolicyMatch] = useState('');
  const [formError, setFormError] = useState('');

  const fetchData = async () => {
    try {
      setIsRefreshing(true);
      const [statsRes, logsRes, auditRes, policiesRes] = await Promise.all([
        fetch('/api/stats').then(r => r.json()),
        fetch('/api/logs').then(r => r.json()),
        fetch('/api/audit-logs').then(r => r.json()),
        fetch('/api/policies').then(r => r.json())
      ]);
      setStats(statsRes);
      setLogs(logsRes);
      setAuditLogs(auditRes);
      setPolicies(policiesRes);
    } catch (e) {
      console.error('Data fetch failed', e);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleAddPolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    try {
      const res = await fetch('/api/policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type: newPolicyType, 
          target: newPolicyTarget, 
          match: newPolicyMatch,
          limit: newPolicyLimit,
          windowMs: newPolicyWindow,
          burst: newPolicyBurst
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Failed to add policy');
      } else {
        setNewPolicyMatch('');
        setNewPolicyLimit('');
        setNewPolicyWindow('');
        setNewPolicyBurst('');
        setShowPolicyForm(false);
        fetchData();
      }
    } catch (e) {
      setFormError('Network error');
    }
  };

  const handleDeletePolicy = async (id: string) => {
    await fetch(`/api/policies/${id}`, { method: 'DELETE' });
    fetchData();
  };

  const simulateTraffic = async () => {
    const paths = ['/gateway/api/users', '/gateway/admin', '/gateway/dashboard'];
    const ips = ['192.168.1.100', '10.0.0.5', '8.8.8.8', '192.168.1.100'];
    
    for(let i=0; i<5; i++) {
        fetch(paths[Math.floor(Math.random() * paths.length)], {
            headers: { 'x-mock-ip': ips[Math.floor(Math.random() * ips.length)] }
        }).catch(() => {});
    }
    setTimeout(fetchData, 500);
  };

  const NavItem = ({ icon, label, view }: { icon: React.ReactNode, label: string, view: string }) => {
    const isActive = activeView === view;
    return (
      <button 
        onClick={() => setActiveView(view)} 
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${
          isActive 
          ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20' 
          : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent'
        }`}
      >
        {React.cloneElement(icon as React.ReactElement, { className: 'w-5 h-5 shrink-0' })}
        <span className="text-sm tracking-wide">{label}</span>
      </button>
    );
  };

  return (
    <div className="flex h-screen w-full overflow-hidden font-sans bg-[#020617] text-slate-100 selection:bg-violet-500/30">
      {/* Sidebar Navigation */}
      <aside className="w-72 border-r border-slate-800/60 bg-[#060c1c] flex flex-col shrink-0 flex-none relative">
        <div className="p-8 pb-6 flex items-center gap-4">
          <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center font-bold text-xl text-white shadow-lg shadow-violet-500/20">T</div>
          <div>
            <h1 className="text-base font-bold tracking-tight leading-none text-white uppercase">Toll Router</h1>
            <span className="text-[11px] text-violet-400/80 font-mono font-medium tracking-widest uppercase mt-1 block">OSS Edition</span>
          </div>
        </div>
        
        <nav className="flex-1 px-4 py-4 space-y-2">
          <NavItem icon={<Activity />} label="Dashboard" view="dashboard" />
          <NavItem icon={<ShieldAlert />} label={`Policies (${policies.length}/5)`} view="policies" />
          <NavItem icon={<Server />} label="Audit Logs" view="audit" />
          <NavItem icon={<Search />} label="Search Engine" view="search" />
        </nav>

        <div className="p-6 border-t border-slate-800/60 w-full">
          <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-emerald-400 opacity-50" />
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-4">Runtime Status</p>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-slate-200">Node Active</span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)] animate-pulse"></span>
            </div>
            <p className="text-xs text-indigo-400/80 font-mono flex items-center gap-2">
              <Server className="w-4 h-4 shrink-0" /> Local Memory
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-y-auto bg-[#020617] relative">
        <div className="absolute top-0 right-0 p-8 flex items-center gap-4 z-50">
          <button 
            onClick={simulateTraffic}
            className="bg-slate-900 hover:bg-slate-800 border border-slate-700 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 text-slate-200 shadow-xl"
          >
            <Activity className="w-4 h-4 text-emerald-400" />
            Simulate Traffic
          </button>
        </div>

        {activeView === 'dashboard' && (
          <div className="p-10 max-w-7xl mx-auto w-full flex-1">
            <header className="mb-10">
              <h2 className="text-3xl font-bold tracking-tight text-white">Gateway Monitor</h2>
              <p className="text-slate-500 font-medium mt-2 text-sm">Real-time overview of the Toll Router operations.</p>
            </header>

            <section className="grid grid-cols-4 gap-6 mb-10 shrink-0">
              <MetricCard title="Total Requests" value={stats.totalRequests.toLocaleString()} textColor="text-white" />
              <MetricCard title="Avg Latency" value={`${stats.avgLatency} ms`} textColor="text-emerald-400" />
              <MetricCard title="Blocked Requests" value={stats.blockedRequests.toLocaleString()} textColor="text-rose-400" />
              
              <div className="bg-[#090e1a] p-6 rounded-2xl border border-slate-800/80 relative">
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-2">Bot Detection</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-4xl font-mono font-bold text-violet-400">{(Math.min(100, (stats.blockedRequests / (stats.totalRequests || 1)) * 100)).toFixed(1)}%</h3>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-violet-500" />
                  <span className="text-xs text-slate-400">Automatic Filtering Active</span>
                </div>
              </div>
            </section>

            <div className="grid grid-cols-3 gap-8">
              {/* Traffic Stream */}
              <div className="col-span-2 bg-[#090e1a] rounded-2xl border border-slate-800/80 flex flex-col overflow-hidden min-h-[500px]">
                <div className="px-8 py-5 border-b border-slate-800/80 flex justify-between items-center bg-[#0d1424]">
                  <h3 className="text-sm font-bold text-slate-200 tracking-wide">Recent Request Stream</h3>
                  <div className="flex items-center gap-3">
                    <RefreshCw className={`w-4 h-4 text-slate-500 ${isRefreshing ? 'animate-spin' : ''}`} />
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/50"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/20"></div>
                    </div>
                  </div>
                </div>
                <div className="flex-1 overflow-auto p-0">
                  <table className="w-full text-left">
                    <thead className="sticky top-0 bg-[#090e1a]/90 backdrop-blur z-10">
                      <tr className="text-xs uppercase text-slate-500 font-bold border-b border-slate-800/80">
                        <th className="px-8 py-4 font-semibold tracking-wider">Time</th>
                        <th className="px-8 py-4 font-semibold tracking-wider">IP</th>
                        <th className="px-8 py-4 font-semibold tracking-wider">Method & Path</th>
                        <th className="px-8 py-4 font-semibold tracking-wider">Status</th>
                        <th className="px-8 py-4 font-semibold tracking-wider text-right">Latency</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50 font-mono text-sm">
                      {logs.slice(0, 20).map(log => (
                        <tr key={log.id} className={`hover:bg-slate-800/30 transition-colors ${log.blocked ? 'bg-rose-900/5' : ''}`}>
                          <td className="px-8 py-4 text-slate-500">
                            {format(log.timestamp, 'HH:mm:ss.SSS')}
                          </td>
                          <td className="px-8 py-4 text-slate-300">
                            {log.ip}
                          </td>
                          <td className="px-8 py-4">
                            <span className={`mr-2 font-bold ${
                              log.method === 'GET' ? 'text-violet-400' : 
                              log.method === 'POST' ? 'text-blue-400' : 
                              log.method === 'PUT' ? 'text-amber-400' :
                              'text-slate-400'
                            }`}>
                              {log.method}
                            </span>
                            <span className="text-slate-400">{log.path}</span>
                          </td>
                          <td className="px-8 py-4">
                            <span className={`${
                              log.blocked ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 
                              log.status >= 400 ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                              'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                            } px-2.5 py-1 rounded-md text-xs border font-bold uppercase`}>
                              {log.blocked ? 'BLOCKED' : `${log.status} OK`}
                            </span>
                          </td>
                          <td className="px-8 py-4 text-right text-slate-500">
                            {log.latency}ms
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Real-time traffic monitor right column */}
              <div className="flex flex-col gap-6">
                <div className="bg-[#090e1a] rounded-2xl border border-slate-800/80 p-6 flex flex-col flex-1 h-[250px]">
                  <h3 className="text-sm font-bold text-slate-200 tracking-wide mb-6">Live Pipeline Stats</h3>
                  <div className="flex-1 flex flex-col justify-end relative">
                     <div className="w-full flex items-end justify-between h-32 gap-2 opacity-80">
                        {Array.from({length: 12}).map((_, i) => (
                           <div key={i} className="w-full bg-violet-600/20 rounded-t-sm" style={{height: `${Math.floor(Math.random() * 100)}%`}}>
                             <div className="w-full bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.5)] rounded-t-sm transition-all" style={{height: `${Math.floor(Math.random() * 100)}%`}}></div>
                           </div>
                        ))}
                     </div>
                     <p className="text-xs text-slate-500 font-mono text-center mt-4">Req / Sec (Simulated)</p>
                  </div>
                </div>

                <div className="bg-[#090e1a] rounded-2xl border border-slate-800/80 p-8 flex flex-col flex-1">
                  <h3 className="text-sm font-bold text-slate-200 tracking-wide mb-6">Active Policies Summary</h3>
                  <div className="text-6xl font-mono font-bold text-slate-100 mt-2 mb-4">{policies.length}<span className="text-3xl text-slate-600">/5</span></div>
                  <div className="h-1.5 bg-slate-800 rounded-full mb-6 overflow-hidden">
                    <div 
                      className="h-full bg-violet-500 rounded-full transition-all" 
                      style={{ width: `${(policies.length / 5) * 100}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-slate-400 leading-relaxed mb-6">
                    You have configured {policies.length} out of 5 allowed local policies in the OSS edition limit.
                  </p>
                  <button onClick={() => setActiveView('policies')} className="mt-auto block w-full text-center py-3 rounded-lg border border-slate-700 bg-slate-800/50 hover:bg-slate-800 text-sm font-semibold transition-colors">
                    Manage Policies
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeView === 'policies' && (
          <div className="p-10 max-w-5xl mx-auto w-full">
            <header className="mb-10 flex items-end justify-between">
              <div>
                <h2 className="text-3xl font-bold tracking-tight text-white mb-2">Governance Policies</h2>
                <p className="text-slate-500 font-medium text-sm">Define rules for rate limiting, blocking, and allowing traffic.</p>
              </div>
              <button 
                onClick={() => setShowPolicyForm(!showPolicyForm)}
                className="bg-violet-600 hover:bg-violet-500 px-5 py-3 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 text-white shadow-lg shadow-violet-600/20"
              >
                <Plus className="w-4 h-4" />
                {showPolicyForm ? 'Cancel Creation' : 'Create Policy'}
              </button>
            </header>

            {showPolicyForm && (
              <div className="bg-[#090e1a] p-8 rounded-2xl border border-violet-500/30 shadow-2xl shadow-violet-900/20 mb-10">
                <h3 className="font-bold text-lg text-white mb-6">New Policy Definition</h3>
                <form onSubmit={handleAddPolicy} className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Policy Type</label>
                      <select 
                        value={newPolicyType} 
                        onChange={e => setNewPolicyType(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-200 focus:ring-2 focus:ring-violet-500 outline-none transition-all shadow-inner"
                      >
                        <option value="block">Block Traffic</option>
                        <option value="allow">Allow Traffic (Bypass)</option>
                        <option value="rate-limit">Rate Limit Token Bucket</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Target Resource</label>
                       <select 
                         value={newPolicyTarget} 
                         onChange={e => setNewPolicyTarget(e.target.value)}
                         className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-200 focus:ring-2 focus:ring-violet-500 outline-none transition-all shadow-inner"
                       >
                         <option value="ip">Client IP Address</option>
                         <option value="path">Endpoint Path</option>
                         <option value="api-key">API Key (Header)</option>
                       </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Match Value</label>
                    <input 
                      type="text" 
                      value={newPolicyMatch}
                      onChange={e => setNewPolicyMatch(e.target.value)}
                      placeholder="e.g. 192.168.1.100, /api/auth, or * for all"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm font-mono text-white placeholder-slate-600 focus:ring-2 focus:ring-violet-500 outline-none transition-all shadow-inner"
                      required
                    />
                  </div>

                  {newPolicyType === 'rate-limit' && (
                    <div className="grid grid-cols-3 gap-6 p-6 bg-slate-900/50 rounded-xl border border-slate-800">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Limit</label>
                        <input type="number" placeholder="Reqs" value={newPolicyLimit} onChange={e => setNewPolicyLimit(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-amber-500" required />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Window (ms)</label>
                        <input type="number" placeholder="Milliseconds" value={newPolicyWindow} onChange={e => setNewPolicyWindow(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-amber-500" required />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Burst</label>
                        <input type="number" placeholder="Pool size" value={newPolicyBurst} onChange={e => setNewPolicyBurst(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-amber-500" />
                      </div>
                    </div>
                  )}

                  {formError && <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-sm font-medium">{formError}</div>}

                  <div className="flex justify-end pt-4">
                    <button 
                      type="submit" 
                      disabled={policies.length >= 5}
                      className="bg-violet-600 hover:bg-violet-500 px-8 py-3 rounded-xl text-sm font-bold transition-all text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {policies.length >= 5 ? 'Limit Reached' : 'Save Policy'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="space-y-6">
              {policies.length === 0 ? (
                <div className="p-16 border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center text-center">
                  <ShieldCheck className="w-12 h-12 text-slate-700 mb-4" />
                  <h4 className="text-lg font-bold text-slate-300">No Policies Defined</h4>
                  <p className="text-slate-500 text-sm mt-2 max-w-sm">Create a policy to start controlling traffic through your local gateway node.</p>
                </div>
              ) : (
                policies.map(p => (
                  <div key={p.id} className="bg-[#090e1a] border border-slate-800 rounded-2xl p-6 flex items-center justify-between group hover:border-slate-600 transition-colors">
                    <div className="flex items-center gap-6">
                      <div className={`w-1.5 h-16 rounded-full ${
                        p.type === 'allow' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 
                        p.type === 'rate-limit' ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 
                        'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]'
                      }`} />
                      
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase border ${
                             p.type === 'allow' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                             p.type === 'rate-limit' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 
                             'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          }`}>
                            {p.type} Priority
                          </span>
                          <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{p.target} MATCH</span>
                        </div>
                        <div className="text-xl font-mono font-bold text-white tracking-tight">
                          {p.match}
                        </div>
                        {p.type === 'rate-limit' && (
                          <div className="text-sm font-mono text-amber-400/80 mt-2">
                            Limits to {p.limit} requests per {p.windowMs}ms
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => handleDeletePolicy(p.id)} 
                      className="p-3 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-rose-600 hover:border-rose-500 rounded-xl transition-all shadow-sm opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeView === 'audit' && (
          <div className="flex flex-col h-full bg-[#020617]">
            <header className="p-10 pb-6 shrink-0 border-b border-slate-800/80 bg-[#090e1a]/50">
              <div className="max-w-7xl mx-auto flex items-end justify-between">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight text-white mb-2">Audit Logs</h2>
                  <p className="text-slate-500 font-medium text-sm">System configuration and state tracking.</p>
                </div>
                <div className="w-96 relative">
                  <Search className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input 
                    type="text" 
                    value={auditSearchQuery}
                    onChange={(e) => setAuditSearchQuery(e.target.value)}
                    placeholder="Search audit actions, details..." 
                    className="w-full bg-[#0d1424] border border-slate-700/80 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 shadow-inner"
                  />
                </div>
              </div>
            </header>

            <div className="flex-1 overflow-auto p-10 pt-6">
               <div className="max-w-7xl mx-auto rounded-2xl border border-slate-800/80 bg-[#090e1a] overflow-hidden shadow-2xl">
                 <table className="w-full text-left text-sm">
                    <thead className="bg-[#0d1424]">
                      <tr className="text-xs uppercase text-slate-500 font-bold border-b border-slate-800">
                        <th className="px-8 py-5">Timestamp</th>
                        <th className="px-8 py-5">User ID</th>
                        <th className="px-8 py-5">Action</th>
                        <th className="px-8 py-5">System Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {auditLogs.filter(log => !auditSearchQuery || log.action.toLowerCase().includes(auditSearchQuery.toLowerCase()) || log.details.toLowerCase().includes(auditSearchQuery.toLowerCase())).length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-8 py-16 text-center text-slate-500 font-medium">No results found in audit records.</td>
                        </tr>
                      ) : (
                        auditLogs.filter(log => !auditSearchQuery || log.action.toLowerCase().includes(auditSearchQuery.toLowerCase()) || log.details.toLowerCase().includes(auditSearchQuery.toLowerCase())).map(log => (
                          <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="px-8 py-5 font-mono text-slate-400">{format(log.timestamp, 'yyyy-MM-dd HH:mm:ss')}</td>
                            <td className="px-8 py-5">
                              <span className="bg-indigo-500/10 text-indigo-400 px-3 py-1.5 rounded-lg border border-indigo-500/20 font-mono text-xs">
                                {log.user}
                              </span>
                            </td>
                            <td className="px-8 py-5 font-semibold text-slate-200">{log.action}</td>
                            <td className="px-8 py-5 text-slate-400 font-mono text-xs">{log.details}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                 </table>
               </div>
            </div>
          </div>
        )}

        {activeView === 'search' && (
          <div className="p-10 max-w-5xl mx-auto w-full">
             <header className="mb-12 text-center mt-12">
                <Search className="w-12 h-12 text-violet-500 mx-auto mb-6 bg-violet-500/10 p-2.5 rounded-2xl shadow-[0_0_30px_rgba(139,92,246,0.3)]" />
                <h2 className="text-4xl font-bold tracking-tight text-white mb-4">Local Search Engine</h2>
                <p className="text-slate-400 text-base max-w-md mx-auto">Query traffic logs, blocked requests, and configuration state instantly from local memory.</p>
             </header>

             <div className="relative max-w-2xl mx-auto mb-12">
               <Search className="w-6 h-6 text-violet-400 absolute left-6 top-1/2 -translate-y-1/2" />
               <input 
                 autoFocus
                 type="text" 
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 placeholder="Search by IP (e.g. 192.168), path, or method..." 
                 className="w-full bg-[#090e1a] border-2 border-slate-700 hover:border-violet-500/50 focus:border-violet-500 rounded-2xl pl-16 pr-6 py-5 text-lg text-white placeholder-slate-500 focus:outline-none focus:ring-4 focus:ring-violet-500/20 shadow-2xl transition-all"
               />
               {searchQuery && (
                 <button onClick={() => setSearchQuery('')} className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white font-bold bg-slate-800 rounded-full w-8 h-8 flex items-center justify-center">×</button>
               )}
             </div>

             {searchQuery && (
               <div className="bg-[#090e1a] rounded-2xl border border-slate-800/80 shadow-2xl overflow-hidden">
                 <div className="px-8 py-4 bg-[#0d1424] border-b border-slate-800/80">
                   <h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest">Search Results</h3>
                 </div>
                 <div className="p-0">
                   {logs.filter(log => log.ip.includes(searchQuery) || log.path.includes(searchQuery) || log.method.includes(searchQuery.toUpperCase())).length === 0 ? (
                      <div className="p-16 text-center text-slate-500">No logs matched your query.</div>
                   ) : (
                     <table className="w-full text-left">
                       <tbody className="divide-y divide-slate-800/50 font-mono text-sm">
                         {logs.filter(log => log.ip.includes(searchQuery) || log.path.includes(searchQuery) || log.method.includes(searchQuery.toUpperCase())).map(log => (
                           <tr key={log.id} className={`hover:bg-slate-800/30 ${log.blocked ? 'bg-rose-900/5' : ''}`}>
                              <td className="px-8 py-4 text-slate-500">{format(log.timestamp, 'HH:mm:ss')}</td>
                              <td className="px-8 py-4 text-slate-300 font-bold">{log.ip}</td>
                              <td className="px-8 py-4 text-slate-400">{log.method} {log.path}</td>
                              <td className="px-8 py-4 text-right">
                                <span className={`${log.blocked ? 'text-rose-500' : 'text-emerald-500'} font-bold`}>
                                  {log.blocked ? 'BLOCKED' : log.status}
                                </span>
                              </td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   )}
                 </div>
               </div>
             )}
          </div>
        )}

      </main>
    </div>
  );
}

function MetricCard({ title, value, textColor }: { title: string, value: string, textColor: string }) {
  return (
    <div className="bg-[#090e1a] p-6 rounded-2xl border border-slate-800/80 shadow-lg shadow-black/20">
      <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-2">{title}</p>
      <h3 className={`text-4xl font-mono font-bold ${textColor}`}>{value}</h3>
    </div>
  );
}
