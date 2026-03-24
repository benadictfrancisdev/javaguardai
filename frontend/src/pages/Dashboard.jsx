import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboard } from '../api/client';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  AlertTriangle,
  Server,
  RefreshCw,
  Clock
} from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, alert }) => (
  <div className={`bg-brand-card border ${alert ? 'border-red-800' : 'border-zinc-800'} rounded-xl p-5`}>
    <div className="flex items-center justify-between mb-3">
      <span className="text-sm text-zinc-500">{title}</span>
      {Icon && <Icon className={`w-4 h-4 ${alert ? 'text-red-400' : 'text-zinc-600'}`} />}
    </div>
    <div className="text-3xl font-bold font-mono text-white">{value}</div>
  </div>
);

const ChartTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-zinc-900/95 border border-zinc-700 rounded-lg p-3 shadow-xl">
        <p className="text-xs text-zinc-400 mb-1">{label}</p>
        <p className="text-sm font-mono text-brand-green">
          {payload[0].value} error{payload[0].value !== 1 ? 's' : ''}
        </p>
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setError(null);
      const res = await getDashboard();
      setData(res);
    } catch (err) {
      console.error('Failed to fetch dashboard:', err);
      setError('Could not reach the backend. Is the server running?');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-brand-green animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-zinc-400">
        <AlertTriangle className="w-10 h-10 mb-3 text-red-400" />
        <p>{error}</p>
        <button onClick={handleRefresh} className="mt-4 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white">
          Retry
        </button>
      </div>
    );
  }

  const chartData = (data?.errors_by_service || []).map(s => ({
    service: s.service,
    count: s.count,
  }));

  return (
    <div className="space-y-6" data-testid="dashboard-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-zinc-500">Java error analysis overview</p>
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatCard
          title="Total Errors"
          value={data?.total_errors ?? 0}
          icon={AlertTriangle}
          alert={data?.total_errors > 0}
        />
        <StatCard
          title="Services Affected"
          value={data?.errors_by_service?.length ?? 0}
          icon={Server}
        />
      </div>

      {/* Bar Chart — Errors by Service */}
      <div className="bg-brand-card border border-zinc-800 rounded-xl p-5">
        <h3 className="text-sm font-medium text-zinc-400 mb-4">Errors by Service</h3>
        <div className="h-64">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="service" stroke="#52525b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#52525b" tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Bar dataKey="count" fill="#00E5A0" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-zinc-500">
              No service data yet
            </div>
          )}
        </div>
      </div>

      {/* Recent Errors */}
      <div className="bg-brand-card border border-zinc-800 rounded-xl p-5">
        <h3 className="text-sm font-medium text-zinc-400 mb-4">Recent Errors</h3>
        {data?.recent_errors?.length > 0 ? (
          <div className="space-y-2">
            {data.recent_errors.map((err) => (
              <div
                key={err.id}
                onClick={() => navigate(`/errors/${err.id}`)}
                className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/50 hover:bg-zinc-800/50 cursor-pointer transition-colors"
                data-testid={`error-row-${err.id}`}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-mono text-white truncate">
                    {err.error_text?.slice(0, 80)}
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Service: <span className="text-zinc-400">{err.service_name}</span>
                  </p>
                </div>
                <span className="text-xs text-zinc-500 flex items-center gap-1 ml-4 shrink-0">
                  <Clock className="w-3 h-3" />
                  {new Date(err.created_at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-32 flex items-center justify-center text-zinc-500">
            <div className="text-center">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-zinc-600" />
              <p>No errors ingested yet</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
