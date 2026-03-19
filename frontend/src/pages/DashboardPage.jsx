import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { MetricCard } from '../components/dashboard/MetricCard';
import { IncidentCard } from '../components/dashboard/IncidentCard';
import { HeapChart } from '../components/dashboard/MetricsCharts';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { 
  AlertTriangle, 
  Activity, 
  Server, 
  Clock,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { formatUptime } from '../lib/utils';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState([]);
  const [metrics, setMetrics] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [incidentsRes, metricsRes, summaryRes] = await Promise.all([
        api.getIncidents(null, 5),
        api.getLatestMetrics(30),
        api.getMetricsSummary(24)
      ]);
      setIncidents(incidentsRes.incidents);
      setMetrics(metricsRes.metrics);
      setSummary(summaryRes);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const activeIncidents = incidents.filter(i => i.status !== 'resolved');
  const criticalCount = incidents.filter(i => i.risk_score >= 80).length;
  const latestMetric = metrics[metrics.length - 1];

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="dashboard-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Production monitoring overview</p>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
          data-testid="refresh-btn"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Active Incidents"
          value={activeIncidents.length}
          subtitle={`${criticalCount} critical`}
          icon={AlertTriangle}
          className={criticalCount > 0 ? 'border-destructive/50' : ''}
        />
        <MetricCard
          title="Heap Usage"
          value={latestMetric ? `${Math.round((latestMetric.heap_used_mb / latestMetric.heap_max_mb) * 100)}%` : 'N/A'}
          subtitle={latestMetric ? `${latestMetric.heap_used_mb.toFixed(0)}MB / ${latestMetric.heap_max_mb.toFixed(0)}MB` : 'No data'}
          icon={Server}
        />
        <MetricCard
          title="Threads"
          value={latestMetric?.thread_count || 'N/A'}
          subtitle={summary ? `Avg: ${summary.avg_thread_count.toFixed(0)}` : 'No data'}
          icon={Activity}
        />
        <MetricCard
          title="JVM Uptime"
          value={latestMetric ? formatUptime(latestMetric.jvm_uptime_ms) : 'N/A'}
          subtitle={`GC Count: ${latestMetric?.gc_count || 0}`}
          icon={Clock}
        />
      </div>

      {/* Charts and Recent Incidents */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Heap Chart */}
        {metrics.length > 0 ? (
          <HeapChart data={metrics} />
        ) : (
          <Card className="tracing-beam">
            <CardHeader>
              <CardTitle className="text-base">Heap Memory Usage</CardTitle>
            </CardHeader>
            <CardContent className="h-64 flex items-center justify-center">
              <p className="text-muted-foreground">No metrics data available</p>
            </CardContent>
          </Card>
        )}

        {/* Recent Incidents */}
        <Card className="tracing-beam">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Incidents</CardTitle>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/incidents')}
              data-testid="view-all-incidents"
            >
              View All <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {incidents.length > 0 ? (
              <div className="space-y-2">
                {incidents.slice(0, 5).map((incident, index) => (
                  <div 
                    key={incident.id}
                    className={`animate-fade-in-up stagger-${index + 1}`}
                    style={{ opacity: 0 }}
                  >
                    <IncidentCard incident={incident} compact />
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center">
                <div className="text-center">
                  <AlertTriangle className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No incidents reported</p>
                  <p className="text-xs text-muted-foreground mt-1">Your systems are running smoothly</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
