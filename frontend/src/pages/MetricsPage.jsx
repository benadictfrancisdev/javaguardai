import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { MetricCard } from '../components/dashboard/MetricCard';
import { HeapChart, ThreadChart, GCChart } from '../components/dashboard/MetricsCharts';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { 
  Server, 
  Activity, 
  Gauge, 
  RefreshCw,
  Layers
} from 'lucide-react';
import { formatUptime } from '../lib/utils';

export default function MetricsPage() {
  const [metrics, setMetrics] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMetrics = async () => {
    try {
      const [metricsRes, summaryRes] = await Promise.all([
        api.getLatestMetrics(60),
        api.getMetricsSummary(24)
      ]);
      setMetrics(metricsRes.metrics);
      setSummary(summaryRes);
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 15000); // Refresh every 15s
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchMetrics();
  };

  const latestMetric = metrics[metrics.length - 1];
  const heapPercent = latestMetric 
    ? ((latestMetric.heap_used_mb / latestMetric.heap_max_mb) * 100).toFixed(1)
    : 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-72" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="metrics-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Metrics</h1>
          <p className="text-muted-foreground">
            {metrics.length} data points • Last 24 hours
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
          data-testid="refresh-metrics-btn"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Heap Usage"
          value={`${heapPercent}%`}
          subtitle={latestMetric 
            ? `${latestMetric.heap_used_mb.toFixed(0)}MB / ${latestMetric.heap_max_mb.toFixed(0)}MB`
            : 'No data'
          }
          icon={Server}
          className={parseFloat(heapPercent) > 80 ? 'border-destructive/50' : ''}
        />
        <MetricCard
          title="Active Threads"
          value={latestMetric?.thread_count || 'N/A'}
          subtitle={summary ? `Avg: ${summary.avg_thread_count.toFixed(0)}` : 'No data'}
          icon={Activity}
        />
        <MetricCard
          title="GC Collections"
          value={latestMetric?.gc_count || 'N/A'}
          subtitle={summary ? `Total: ${summary.total_gc_count}` : 'No data'}
          icon={Layers}
        />
        <MetricCard
          title="JVM Uptime"
          value={latestMetric ? formatUptime(latestMetric.jvm_uptime_ms) : 'N/A'}
          subtitle="Since last restart"
          icon={Gauge}
        />
      </div>

      {/* Charts */}
      {metrics.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <HeapChart data={metrics} />
          <ThreadChart data={metrics} />
          <GCChart data={metrics} />
          
          {/* Summary Card */}
          {summary && (
            <div className="lg:col-span-1">
              <div className="h-full flex flex-col justify-center p-6 rounded-xl border border-border bg-card">
                <h3 className="text-lg font-semibold mb-4">24h Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Avg Heap %</span>
                    <span className="font-mono">{summary.avg_heap_percent.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Max Heap %</span>
                    <span className="font-mono">{summary.max_heap_percent.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Avg Threads</span>
                    <span className="font-mono">{summary.avg_thread_count.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total GC</span>
                    <span className="font-mono">{summary.total_gc_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Data Points</span>
                    <span className="font-mono">{summary.data_points}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="h-64 flex items-center justify-center rounded-xl border border-border bg-card">
          <div className="text-center">
            <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-lg font-medium">No metrics data available</p>
            <p className="text-muted-foreground mt-1">
              Start sending metrics from your Java application
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
