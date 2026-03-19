import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getIncidents, getMetrics, getMetricsSummary } from '../api/client';
import { RiskBadge } from '../components/RiskBadge';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { 
  AlertTriangle, 
  Activity, 
  Server, 
  RefreshCw,
  ArrowRight,
  Clock
} from 'lucide-react';

const StatCard = ({ title, value, subtitle, icon: Icon, alert }) => (
  <div className={`bg-brand-card border ${alert ? 'border-red-800' : 'border-zinc-800'} rounded-xl p-5`}>
    <div className="flex items-center justify-between mb-3">
      <span className="text-sm text-zinc-500">{title}</span>
      {Icon && <Icon className={`w-4 h-4 ${alert ? 'text-red-400' : 'text-zinc-600'}`} />}
    </div>
    <div className="text-3xl font-bold font-mono text-white">{value}</div>
    {subtitle && <p className="text-xs text-zinc-500 mt-1">{subtitle}</p>}
  </div>
);

const HeapGauge = ({ percent }) => {
  const clampedPercent = Math.min(100, Math.max(0, percent || 0));
  let color = '#10b981';
  if (clampedPercent > 80) color = '#ef4444';
  else if (clampedPercent > 60) color = '#f59e0b';

  return (
    <div className="relative w-24 h-24">
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="40" fill="none" stroke="#27272a" strokeWidth="10" />
        <circle
          cx="50" cy="50" r="40" fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={`${clampedPercent * 2.51} 251`}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold font-mono text-white">{Math.round(clampedPercent)}%</span>
      </div>
    </div>
  );
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-zinc-900/95 border border-zinc-700 rounded-lg p-3 shadow-xl">
        <p className="text-xs text-zinc-500 mb-1">{label}</p>
        {payload.map((entry, i) => (
          <p key={i} className="text-sm font-mono" style={{ color: entry.color }}>
            {entry.name}: {entry.value?.toFixed(0)} MB
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState([]);
  const [metrics, setMetrics] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [incidentsRes, metricsRes, summaryRes] = await Promise.all([
        getIncidents(null, 5),
        getMetrics(60),
        getMetricsSummary(24)
      ]);
      setIncidents(incidentsRes.incidents || []);
      setMetrics(metricsRes.metrics || []);
      setSummary(summaryRes);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const latestMetric = metrics[metrics.length - 1];
  const heapPercent = latestMetric && latestMetric.heap_max_mb > 0
    ? (latestMetric.heap_used_mb / latestMetric.heap_max_mb) * 100 : 0;
  
  // Count today's incidents
  const today = new Date().toISOString().split('T')[0];
  const todaysIncidents = incidents.filter(i => 
    i.created_at?.startsWith(today)
  ).length;

  const chartData = metrics.map(m => ({
    time: new Date(m.timestamp || m.created_at).toLocaleTimeString('en-US', { 
      hour: '2-digit', minute: '2-digit' 
    }),
    heap: m.heap_used_mb
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-brand-green animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="dashboard-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-zinc-500">Production monitoring overview</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors disabled:opacity-50"
          data-testid="refresh-btn"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Incidents Today"
          value={todaysIncidents}
          subtitle={`${incidents.filter(i => i.status !== 'resolved').length} active`}
          icon={AlertTriangle}
          alert={todaysIncidents > 0}
        />
        <div className="bg-brand-card border border-zinc-800 rounded-xl p-5 flex items-center gap-4">
          <HeapGauge percent={heapPercent} />
          <div>
            <span className="text-sm text-zinc-500">Heap Usage</span>
            <div className="text-lg font-mono text-white">
              {latestMetric?.heap_used_mb?.toFixed(0) || 0} / {latestMetric?.heap_max_mb?.toFixed(0) || 0} MB
            </div>
          </div>
        </div>
        <StatCard
          title="Active Threads"
          value={latestMetric?.thread_count || 0}
          subtitle={summary ? `Avg: ${summary.avg_thread_count?.toFixed(0) || 0}` : 'No data'}
          icon={Activity}
        />
      </div>

      {/* Chart */}
      <div className="bg-brand-card border border-zinc-800 rounded-xl p-5">
        <h3 className="text-sm font-medium text-zinc-400 mb-4">Heap Memory (Last 60 points)</h3>
        <div className="h-64">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="heapGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00E5A0" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#00E5A0" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="time" stroke="#52525b" tick={{ fontSize: 10 }} />
                <YAxis stroke="#52525b" tick={{ fontSize: 10 }} tickFormatter={v => `${v}MB`} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="heap"
                  name="Heap Used"
                  stroke="#00E5A0"
                  fill="url(#heapGrad)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-zinc-500">
              No metrics data available
            </div>
          )}
        </div>
      </div>

      {/* Recent Incidents */}
      <div className="bg-brand-card border border-zinc-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-zinc-400">Recent Incidents</h3>
          <button
            onClick={() => navigate('/incidents')}
            className="flex items-center gap-1 text-sm text-brand-green hover:text-brand-green/80 transition-colors"
            data-testid="view-all-incidents"
          >
            View All <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        {incidents.length > 0 ? (
          <div className="space-y-2">
            {incidents.slice(0, 5).map((incident) => (
              <div
                key={incident.id}
                onClick={() => navigate(`/incidents?selected=${incident.id}`)}
                className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/50 hover:bg-zinc-800/50 cursor-pointer transition-colors"
                data-testid={`incident-row-${incident.id}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-2 h-2 rounded-full ${
                    incident.status === 'resolved' ? 'bg-green-400' : 
                    incident.status === 'analysed' ? 'bg-blue-400' : 'bg-yellow-400 animate-pulse'
                  }`} />
                  <div className="min-w-0">
                    <p className="text-sm font-mono text-white truncate">
                      {incident.exception_class}
                    </p>
                    <p className="text-xs text-zinc-500 truncate">
                      {incident.message?.slice(0, 50)}...
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <RiskBadge score={incident.risk_score} />
                  <span className="text-xs text-zinc-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(incident.created_at).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-32 flex items-center justify-center text-zinc-500">
            <div className="text-center">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-zinc-600" />
              <p>No incidents reported</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
