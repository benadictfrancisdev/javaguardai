import React from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass rounded-lg p-3 shadow-xl">
        <p className="text-xs text-muted-foreground mb-2">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2">
            <div 
              className="w-2 h-2 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm">
              {entry.name}: <span className="font-mono font-medium">{entry.value}</span>
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export const HeapChart = ({ data }) => {
  const chartData = data.map((m, i) => ({
    time: new Date(m.timestamp).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    }),
    used: m.heap_used_mb,
    max: m.heap_max_mb,
    percent: m.heap_max_mb > 0 ? ((m.heap_used_mb / m.heap_max_mb) * 100).toFixed(1) : 0
  }));

  return (
    <Card className="tracing-beam">
      <CardHeader>
        <CardTitle className="text-base">Heap Memory Usage</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="heapGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(239 84% 67%)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(239 84% 67%)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 6% 16%)" />
              <XAxis 
                dataKey="time" 
                stroke="hsl(240 5% 65%)" 
                tick={{ fontSize: 10 }}
                interval="preserveStartEnd"
              />
              <YAxis 
                stroke="hsl(240 5% 65%)" 
                tick={{ fontSize: 10 }}
                tickFormatter={(v) => `${v}MB`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="used"
                name="Heap Used (MB)"
                stroke="hsl(239 84% 67%)"
                fill="url(#heapGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export const ThreadChart = ({ data }) => {
  const chartData = data.map((m) => ({
    time: new Date(m.timestamp).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    }),
    threads: m.thread_count
  }));

  return (
    <Card className="tracing-beam">
      <CardHeader>
        <CardTitle className="text-base">Thread Count</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 6% 16%)" />
              <XAxis 
                dataKey="time" 
                stroke="hsl(240 5% 65%)" 
                tick={{ fontSize: 10 }}
                interval="preserveStartEnd"
              />
              <YAxis 
                stroke="hsl(240 5% 65%)" 
                tick={{ fontSize: 10 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="threads"
                name="Threads"
                stroke="hsl(160 84% 39%)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export const GCChart = ({ data }) => {
  const chartData = data.map((m) => ({
    time: new Date(m.timestamp).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    }),
    gc: m.gc_count
  }));

  return (
    <Card className="tracing-beam">
      <CardHeader>
        <CardTitle className="text-base">GC Count</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 6% 16%)" />
              <XAxis 
                dataKey="time" 
                stroke="hsl(240 5% 65%)" 
                tick={{ fontSize: 10 }}
                interval="preserveStartEnd"
              />
              <YAxis 
                stroke="hsl(240 5% 65%)" 
                tick={{ fontSize: 10 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="gc"
                name="GC Count"
                stroke="hsl(38 92% 50%)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
