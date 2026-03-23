import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getIncidents, resolveIncident, reanalyseIncident } from '../api/client';
import { RiskBadge } from '../components/RiskBadge';
import { 
  Search, RefreshCw, X, CheckCircle, AlertTriangle, 
  Clock, Target, Lightbulb, Briefcase, Timer, RotateCcw,
  HelpCircle, ListOrdered, Code
} from 'lucide-react';

const StatusChip = ({ status }) => {
  const styles = {
    received: 'bg-yellow-900/30 text-yellow-400 border-yellow-700',
    analysed: 'bg-blue-900/30 text-blue-400 border-blue-700',
    resolved: 'bg-green-900/30 text-green-400 border-green-700',
    error: 'bg-red-900/30 text-red-400 border-red-700'
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium border ${styles[status] || styles.received}`}>
      {status?.toUpperCase()}
    </span>
  );
};

const SidePanel = ({ incident, onClose, onResolve, onReanalyse }) => {
  const [resolving, setResolving] = useState(false);
  const [reanalysing, setReanalysing] = useState(false);

  if (!incident) return null;

  const analysis = incident.analysis || {};

  const handleResolve = async () => {
    setResolving(true);
    try {
      await onResolve(incident.id);
    } finally {
      setResolving(false);
    }
  };

  const handleReanalyse = async () => {
    setReanalysing(true);
    try {
      await onReanalyse(incident.id);
    } finally {
      setReanalysing(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-xl bg-brand-card border-l border-zinc-800 shadow-2xl z-50 overflow-y-auto">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-white font-mono">{incident.exception_class}</h2>
            <p className="text-sm text-zinc-500 mt-1">{incident.message}</p>
            <div className="flex items-center gap-3 mt-2">
              <StatusChip status={incident.status} />
              <RiskBadge score={incident.risk_score} />
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-zinc-800 transition-colors"
            data-testid="close-panel"
          >
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        {/* Actions */}
        {incident.status !== 'resolved' && (
          <div className="flex gap-2 mb-6">
            <button
              onClick={handleResolve}
              disabled={resolving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-green text-brand-dark font-medium hover:bg-brand-green/90 transition-colors disabled:opacity-50"
              data-testid="resolve-btn"
            >
              {resolving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Resolve
            </button>
            <button
              onClick={handleReanalyse}
              disabled={reanalysing || incident.status === 'received'}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 text-white hover:bg-zinc-700 transition-colors disabled:opacity-50"
              data-testid="reanalyse-btn"
            >
              {reanalysing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
              Re-analyse
            </button>
          </div>
        )}

        {/* AI Analysis */}
        {incident.status === 'received' ? (
          <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
            <RefreshCw className="w-8 h-8 animate-spin text-brand-green mb-3" />
            <p>Analysing incident...</p>
          </div>
        ) : analysis && Object.keys(analysis).length > 0 ? (
          <div className="space-y-4">
            {analysis.business_impact && (
              <div className="p-4 rounded-lg bg-zinc-900/50 border border-zinc-800">
                <div className="flex items-center gap-2 text-red-400 mb-2">
                  <Briefcase className="w-4 h-4" />
                  <span className="text-sm font-semibold">WHAT BROKE</span>
                </div>
                <p className="text-sm text-zinc-300">{analysis.business_impact}</p>
              </div>
            )}
            
            {analysis.root_cause && (
              <div className="p-4 rounded-lg bg-zinc-900/50 border border-zinc-800">
                <div className="flex items-center gap-2 text-yellow-400 mb-2">
                  <Target className="w-4 h-4" />
                  <span className="text-sm font-semibold">ROOT CAUSE</span>
                </div>
                <p className="text-sm text-zinc-300">{analysis.root_cause}</p>
              </div>
            )}

            {analysis.why && (
              <div className="p-4 rounded-lg bg-zinc-900/50 border border-zinc-800">
                <div className="flex items-center gap-2 text-orange-400 mb-2">
                  <HelpCircle className="w-4 h-4" />
                  <span className="text-sm font-semibold">WHY IT HAPPENED</span>
                </div>
                <p className="text-sm text-zinc-300">{analysis.why}</p>
              </div>
            )}

            {analysis.fix_steps && (
              <div className="p-4 rounded-lg bg-zinc-900/50 border border-zinc-800">
                <div className="flex items-center gap-2 text-blue-400 mb-2">
                  <ListOrdered className="w-4 h-4" />
                  <span className="text-sm font-semibold">FIX STEPS</span>
                </div>
                <p className="text-sm text-zinc-300 whitespace-pre-line">{analysis.fix_steps}</p>
              </div>
            )}
            
            {analysis.fix_suggestion && (
              <div className="p-4 rounded-lg bg-zinc-900/50 border border-zinc-800">
                <div className="flex items-center gap-2 text-brand-green mb-2">
                  <Lightbulb className="w-4 h-4" />
                  <span className="text-sm font-semibold">HOW TO FIX</span>
                </div>
                <p className="text-sm text-zinc-300">{analysis.fix_suggestion}</p>
              </div>
            )}

            {analysis.code_fix && (
              <div className="p-4 rounded-lg bg-zinc-900/50 border border-zinc-800">
                <div className="flex items-center gap-2 text-green-400 mb-2">
                  <Code className="w-4 h-4" />
                  <span className="text-sm font-semibold">CODE FIX</span>
                </div>
                <pre className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-sm text-zinc-300 font-mono whitespace-pre-wrap overflow-x-auto">
                  {analysis.code_fix}
                </pre>
              </div>
            )}

            <div className="flex items-center gap-4 text-sm">
              {analysis.confidence && (
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500">Confidence:</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    analysis.confidence === 'high' ? 'bg-green-900/30 text-green-400' :
                    analysis.confidence === 'medium' ? 'bg-yellow-900/30 text-yellow-400' :
                    'bg-red-900/30 text-red-400'
                  }`}>
                    {analysis.confidence?.toUpperCase()}
                  </span>
                </div>
              )}
              {analysis.estimated_fix_minutes && (
                <div className="flex items-center gap-2 text-zinc-500">
                  <Timer className="w-4 h-4" />
                  <span>{analysis.estimated_fix_minutes} min to fix</span>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* Stack Trace */}
        <div className="mt-6">
          <h4 className="text-sm font-medium text-zinc-400 mb-2">Stack Trace</h4>
          <pre className="p-4 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-400 font-mono whitespace-pre-wrap overflow-x-auto max-h-64 overflow-y-auto">
            {incident.stack_trace || 'No stack trace available'}
          </pre>
        </div>

        {/* Metadata */}
        <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-zinc-500">Heap Used:</span>
            <span className="ml-2 text-white font-mono">{incident.heap_used_mb || 0} MB</span>
          </div>
          <div>
            <span className="text-zinc-500">Threads:</span>
            <span className="ml-2 text-white font-mono">{incident.thread_count || 0}</span>
          </div>
          <div>
            <span className="text-zinc-500">Timestamp:</span>
            <span className="ml-2 text-white">{new Date(incident.timestamp || incident.created_at).toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const filterTabs = [
  { id: 'all', label: 'All' },
  { id: 'received', label: 'Open' },
  { id: 'resolved', label: 'Resolved' },
  { id: 'critical', label: 'Critical' }
];

export default function Incidents() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIncident, setSelectedIncident] = useState(null);

  const fetchIncidents = async () => {
    try {
      const status = activeTab === 'all' ? null : activeTab === 'critical' ? null : activeTab;
      const response = await getIncidents(status, 100);
      let data = response.incidents || [];
      
      if (activeTab === 'critical') {
        data = data.filter(i => i.risk_score >= 85);
      }
      
      setIncidents(data);

      // Check for selected incident from URL
      const selectedId = searchParams.get('selected');
      if (selectedId) {
        const found = data.find(i => i.id === selectedId);
        if (found) setSelectedIncident(found);
      }
    } catch (error) {
      console.error('Failed to fetch incidents:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [activeTab]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchIncidents();
  };

  const handleResolve = async (id) => {
    await resolveIncident(id);
    fetchIncidents();
    setSelectedIncident(prev => prev?.id === id ? { ...prev, status: 'resolved' } : prev);
  };

  const handleReanalyse = async (id) => {
    await reanalyseIncident(id);
    fetchIncidents();
    setSelectedIncident(prev => prev?.id === id ? { ...prev, status: 'received' } : prev);
  };

  const filteredIncidents = incidents.filter(i => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return i.exception_class?.toLowerCase().includes(q) || 
           i.message?.toLowerCase().includes(q);
  });

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-brand-green animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="incidents-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Incidents</h1>
          <p className="text-zinc-500">{filteredIncidents.length} incidents found</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors disabled:opacity-50"
          data-testid="refresh-incidents"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by exception or message..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-green/50"
            data-testid="search-input"
          />
        </div>
        <div className="flex gap-1 p-1 rounded-lg bg-zinc-900">
          {filterTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id 
                  ? 'bg-brand-green text-brand-dark' 
                  : 'text-zinc-400 hover:text-white'
              }`}
              data-testid={`filter-${tab.id}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-brand-card border border-zinc-800 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-800 text-left">
              <th className="px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Time</th>
              <th className="px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Exception</th>
              <th className="px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Risk</th>
              <th className="px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Status</th>
              <th className="px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredIncidents.length > 0 ? (
              filteredIncidents.map((incident) => (
                <tr 
                  key={incident.id}
                  className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors"
                >
                  <td className="px-4 py-3 text-sm text-zinc-400">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3 h-3" />
                      {formatTime(incident.timestamp || incident.created_at)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-mono text-white truncate max-w-xs">
                      {incident.exception_class}
                    </p>
                    <p className="text-xs text-zinc-500 truncate max-w-xs">
                      {incident.message?.slice(0, 60)}...
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <RiskBadge score={incident.risk_score} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusChip status={incident.status} />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelectedIncident(incident)}
                      className="text-sm text-brand-green hover:text-brand-green/80 transition-colors"
                      data-testid={`view-incident-${incident.id}`}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center">
                  <AlertTriangle className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                  <p className="text-zinc-500">No incidents found</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Side Panel */}
      {selectedIncident && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setSelectedIncident(null)}
          />
          <SidePanel
            incident={selectedIncident}
            onClose={() => setSelectedIncident(null)}
            onResolve={handleResolve}
            onReanalyse={handleReanalyse}
          />
        </>
      )}
    </div>
  );
}
