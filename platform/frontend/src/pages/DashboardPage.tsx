import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Activity, Bug, CheckCircle, Code2, Bot, TrendingUp, Clock } from 'lucide-react';
import { dashboardAPI } from '../services/api';
import type { DashboardStats } from '../types';

const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6'];

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await dashboardAPI.getStats();
        setStats(data);
      } catch (err) {
        console.error('Failed to fetch dashboard stats:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <div className="flex-1 bg-[#1e1e1e] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex-1 bg-[#1e1e1e] flex items-center justify-center">
        <p className="text-[#999] text-sm">Failed to load dashboard. Try refreshing.</p>
      </div>
    );
  }

  const statCards = [
    { label: 'Total Analyses', value: stats.overview.totalAnalyses, icon: Code2, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Total Errors', value: stats.overview.totalErrors, icon: Bug, color: 'text-red-400', bg: 'bg-red-500/10' },
    { label: 'Errors Resolved', value: stats.overview.resolvedErrors, icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10' },
    { label: 'AI Responses', value: stats.overview.totalAIResponses, icon: Bot, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { label: 'Fixes Applied', value: stats.overview.totalFixesApplied, icon: TrendingUp, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
    { label: 'Resolution Rate', value: `${stats.overview.errorResolutionRate}%`, icon: Activity, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  ];

  const errorDistData = stats.errorDistribution.map((d) => ({
    name: d.error_type,
    value: parseInt(d.count),
  }));

  const statusDistData = stats.statusDistribution.map((d) => ({
    name: d.status.replace('_', ' '),
    value: parseInt(d.count),
  }));

  const activityData = stats.dailyActivity.map((d) => ({
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    count: parseInt(d.count),
  }));

  return (
    <div className="flex-1 bg-[#1e1e1e] overflow-auto p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-[#999]">Your code analysis overview</p>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {statCards.map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="bg-[#252526] rounded-lg p-4 border border-[#333]">
              <div className={`w-8 h-8 ${bg} rounded-lg flex items-center justify-center mb-3`}>
                <Icon size={16} className={color} />
              </div>
              <p className="text-lg font-bold text-white">{value}</p>
              <p className="text-[11px] text-[#999]">{label}</p>
            </div>
          ))}
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Activity chart */}
          <div className="bg-[#252526] rounded-lg p-4 border border-[#333]">
            <h3 className="text-sm font-medium text-white mb-4">Activity (Last 7 Days)</h3>
            {activityData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={activityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#999' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#999' }} />
                  <Tooltip
                    contentStyle={{ background: '#333', border: 'none', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6' }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-xs text-[#999]">
                No activity data yet
              </div>
            )}
          </div>

          {/* Error distribution */}
          <div className="bg-[#252526] rounded-lg p-4 border border-[#333]">
            <h3 className="text-sm font-medium text-white mb-4">Error Distribution</h3>
            {errorDistData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={errorDistData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {errorDistData.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#333', border: 'none', borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-xs text-[#999]">
                No errors recorded yet
              </div>
            )}
          </div>
        </div>

        {/* Status distribution + Recent snippets */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Status distribution bar chart */}
          <div className="bg-[#252526] rounded-lg p-4 border border-[#333]">
            <h3 className="text-sm font-medium text-white mb-4">Execution Status</h3>
            {statusDistData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={statusDistData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#999' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#999' }} />
                  <Tooltip contentStyle={{ background: '#333', border: 'none', borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-xs text-[#999]">
                No data yet
              </div>
            )}
          </div>

          {/* Recent snippets */}
          <div className="bg-[#252526] rounded-lg p-4 border border-[#333]">
            <h3 className="text-sm font-medium text-white mb-4">Recent Submissions</h3>
            {stats.recentSnippets.length > 0 ? (
              <div className="space-y-2">
                {stats.recentSnippets.map((snippet) => (
                  <div key={snippet.id} className="flex items-center gap-3 p-2 bg-[#1e1e1e] rounded">
                    <div className={`w-2 h-2 rounded-full ${
                      snippet.status === 'success' ? 'bg-green-400' :
                      snippet.status === 'compilation_error' || snippet.status === 'runtime_error' ? 'bg-red-400' :
                      'bg-yellow-400'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white truncate">{snippet.title}</p>
                      <div className="flex items-center gap-2 text-[10px] text-[#999]">
                        <span className="capitalize">{snippet.status.replace('_', ' ')}</span>
                        {snippet.execution_time_ms && (
                          <span className="flex items-center gap-0.5">
                            <Clock size={10} />
                            {snippet.execution_time_ms}ms
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] text-[#666]">
                      {new Date(snippet.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-xs text-[#999]">
                No submissions yet. Start by analyzing some code!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
