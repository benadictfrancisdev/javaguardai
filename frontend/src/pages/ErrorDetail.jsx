import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getError } from '../api/client';
import {
  ArrowLeft,
  RefreshCw,
  AlertTriangle,
  Target,
  HelpCircle,
  ListOrdered,
  Code
} from 'lucide-react';

const AnalysisCard = ({ icon: Icon, color, title, children }) => (
  <div className="p-4 rounded-lg bg-zinc-900/50 border border-zinc-800">
    <div className={`flex items-center gap-2 ${color} mb-2`}>
      <Icon className="w-4 h-4" />
      <span className="text-sm font-semibold">{title}</span>
    </div>
    {children}
  </div>
);

export default function ErrorDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getError(id);
        setError(data);
      } catch (err) {
        setFetchError(err.response?.status === 404 ? 'Error not found' : 'Failed to load error details');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-brand-green animate-spin" />
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-zinc-400">
        <AlertTriangle className="w-10 h-10 mb-3 text-red-400" />
        <p>{fetchError}</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="mt-4 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const analysis = error?.analysis;

  return (
    <div className="space-y-6" data-testid="error-detail-page">
      {/* Back button + header */}
      <div>
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors mb-4"
          data-testid="back-btn"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>

        <h1 className="text-xl font-bold text-white mb-1">Error #{error.id}</h1>
        <p className="text-sm text-zinc-500">
          Service: <span className="text-zinc-300">{error.service_name}</span>
          {' | '}
          {new Date(error.created_at).toLocaleString()}
        </p>
      </div>

      {/* Error text */}
      <div className="bg-brand-card border border-zinc-800 rounded-xl p-5">
        <h3 className="text-sm font-medium text-zinc-400 mb-3">Error Text</h3>
        <pre className="p-4 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 font-mono whitespace-pre-wrap overflow-x-auto max-h-48 overflow-y-auto">
          {error.error_text}
        </pre>
      </div>

      {/* AI Analysis */}
      {analysis ? (
        <div className="bg-brand-card border border-zinc-800 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-medium text-zinc-400 mb-2">AI Analysis</h3>

          {analysis.root_cause && (
            <AnalysisCard icon={Target} color="text-yellow-400" title="ROOT CAUSE">
              <p className="text-sm text-zinc-300">{analysis.root_cause}</p>
            </AnalysisCard>
          )}

          {analysis.why && (
            <AnalysisCard icon={HelpCircle} color="text-orange-400" title="WHY IT HAPPENED">
              <p className="text-sm text-zinc-300">{analysis.why}</p>
            </AnalysisCard>
          )}

          {analysis.fix_steps && (
            <AnalysisCard icon={ListOrdered} color="text-blue-400" title="FIX STEPS">
              <p className="text-sm text-zinc-300 whitespace-pre-line">{analysis.fix_steps}</p>
            </AnalysisCard>
          )}

          {analysis.code_fix && (
            <AnalysisCard icon={Code} color="text-green-400" title="CODE FIX">
              <pre className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-sm text-zinc-300 font-mono whitespace-pre-wrap overflow-x-auto">
                {analysis.code_fix}
              </pre>
            </AnalysisCard>
          )}
        </div>
      ) : (
        <div className="bg-brand-card border border-zinc-800 rounded-xl p-5 text-center text-zinc-500">
          <p>No analysis available for this error.</p>
        </div>
      )}
    </div>
  );
}
