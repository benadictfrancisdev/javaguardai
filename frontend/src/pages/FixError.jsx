import React, { useState, useEffect, useCallback } from 'react';
import { fixError } from '../api/client';
import {
  Shield,
  Zap,
  Copy,
  Check,
  Loader2,
  Target,
  HelpCircle,
  ListOrdered,
  Code,
  Clock,
  Trash2,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';

const HISTORY_KEY = 'javaguard_history';
const MAX_HISTORY = 10;

function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveHistory(entries) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, MAX_HISTORY)));
}

/* ---------- small reusable bits ---------- */

const CopyButton = ({ text }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 px-2 py-1 rounded text-xs text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
      title="Copy to clipboard"
    >
      {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
};

const AnalysisCard = ({ icon: Icon, color, title, children, copyText }) => (
  <div className="p-4 rounded-lg bg-zinc-900/50 border border-zinc-800 animate-fadeIn">
    <div className="flex items-center justify-between mb-2">
      <div className={`flex items-center gap-2 ${color}`}>
        <Icon className="w-4 h-4" />
        <span className="text-sm font-semibold">{title}</span>
      </div>
      {copyText && <CopyButton text={copyText} />}
    </div>
    {children}
  </div>
);

const PulsingDots = () => (
  <div className="flex items-center gap-1.5">
    <div className="w-2 h-2 rounded-full bg-brand-green animate-bounce" style={{ animationDelay: '0ms' }} />
    <div className="w-2 h-2 rounded-full bg-brand-green animate-bounce" style={{ animationDelay: '150ms' }} />
    <div className="w-2 h-2 rounded-full bg-brand-green animate-bounce" style={{ animationDelay: '300ms' }} />
  </div>
);

/* ---------- Main component ---------- */

export default function FixError() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState(getHistory);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    saveHistory(history);
  }, [history]);

  const handleFix = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await fixError(trimmed);
      setResult(data);

      // Save to history
      const entry = {
        id: Date.now(),
        input: trimmed.slice(0, 120),
        timestamp: new Date().toISOString(),
      };
      setHistory((prev) => [entry, ...prev.filter((h) => h.id !== entry.id)].slice(0, MAX_HISTORY));
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        err.message ||
        'Something went wrong. Is the backend running?';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [input, loading]);

  const handleKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleFix();
    }
  };

  const loadHistoryItem = (item) => {
    setInput(item.input);
    setShowHistory(false);
  };

  const clearHistory = () => {
    setHistory([]);
    setShowHistory(false);
  };

  const isFallback =
    result?.root_cause?.includes('AI analysis unavailable') ||
    result?.root_cause?.includes('No input provided');

  return (
    <div className="flex flex-col h-screen bg-brand-dark" data-testid="fix-error-page">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-zinc-800 bg-brand-card shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-brand-green/20">
            <Shield className="w-5 h-5 text-brand-green" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white leading-tight">JavaGuard AI</h1>
            <p className="text-[11px] text-zinc-500">AI-powered Java error fixer</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <Clock className="w-3.5 h-3.5" />
            History ({history.length})
          </button>
        </div>
      </header>

      {/* Main split pane */}
      <div className="flex flex-1 min-h-0">
        {/* LEFT — Editor */}
        <div className="flex flex-col w-1/2 border-r border-zinc-800">
          <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-900/50">
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Input</span>
            <span className="text-[10px] text-zinc-600">Paste Java error, stack trace, or code</span>
          </div>

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Paste your Java error here...\n\nExamples:\n• java.lang.NullPointerException\n• Stack trace from Spring Boot\n• Java code with bugs\n\nPress Ctrl+Enter to fix`}
            className="flex-1 w-full p-4 bg-transparent text-sm text-zinc-200 font-mono resize-none focus:outline-none placeholder:text-zinc-600"
            spellCheck={false}
            data-testid="error-input"
          />

          <div className="px-4 py-3 border-t border-zinc-800 bg-zinc-900/30 shrink-0">
            <button
              onClick={handleFix}
              disabled={!input.trim() || loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-brand-green text-brand-dark font-semibold text-sm hover:bg-brand-green/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              data-testid="fix-btn"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Fix Error
                </>
              )}
            </button>
            <p className="text-[10px] text-zinc-600 text-center mt-1.5">
              {loading ? 'Powered by AI — may take a few seconds' : 'Ctrl+Enter to submit'}
            </p>
          </div>
        </div>

        {/* RIGHT — Output */}
        <div className="flex flex-col w-1/2 overflow-y-auto">
          <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-900/50">
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Output</span>
            {result && !isFallback && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-900/40 text-green-400 border border-green-800/50">
                AI Analysis
              </span>
            )}
          </div>

          <div className="flex-1 p-4 space-y-4 overflow-y-auto">
            {/* Loading state */}
            {loading && (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <PulsingDots />
                <p className="text-sm text-zinc-500">Analyzing your Java error...</p>
              </div>
            )}

            {/* Error state */}
            {error && (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <AlertTriangle className="w-8 h-8 text-red-400" />
                <p className="text-sm text-red-400 text-center max-w-md">{error}</p>
                <button
                  onClick={handleFix}
                  className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-sm hover:bg-zinc-700 transition-colors"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Empty state */}
            {!loading && !error && !result && (
              <div className="flex flex-col items-center justify-center h-full text-zinc-600 gap-3">
                <Zap className="w-10 h-10" />
                <div className="text-center">
                  <p className="text-sm font-medium text-zinc-400">Paste a Java error and click Fix Error</p>
                  <p className="text-xs text-zinc-600 mt-1">Get instant root cause, explanation, and working fix</p>
                </div>
              </div>
            )}

            {/* Result */}
            {result && !loading && (
              <div className="space-y-4">
                {isFallback && (
                  <div className="p-3 rounded-lg bg-yellow-900/20 border border-yellow-800/40 text-yellow-400 text-xs">
                    AI service unavailable — showing fallback analysis. Try again in a moment.
                  </div>
                )}

                {result.root_cause && (
                  <AnalysisCard icon={Target} color="text-yellow-400" title="ROOT CAUSE" copyText={result.root_cause}>
                    <p className="text-sm text-zinc-300">{result.root_cause}</p>
                  </AnalysisCard>
                )}

                {result.why && (
                  <AnalysisCard icon={HelpCircle} color="text-orange-400" title="WHY IT HAPPENED" copyText={result.why}>
                    <p className="text-sm text-zinc-300 whitespace-pre-line">{result.why}</p>
                  </AnalysisCard>
                )}

                {result.fix_steps && (
                  <AnalysisCard icon={ListOrdered} color="text-blue-400" title="FIX STEPS" copyText={result.fix_steps}>
                    <p className="text-sm text-zinc-300 whitespace-pre-line">{result.fix_steps}</p>
                  </AnalysisCard>
                )}

                {result.code_fix && (
                  <AnalysisCard icon={Code} color="text-green-400" title="CODE FIX" copyText={result.code_fix}>
                    <pre className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-sm text-zinc-300 font-mono whitespace-pre-wrap overflow-x-auto">
                      {result.code_fix}
                    </pre>
                  </AnalysisCard>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* History sidebar overlay */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowHistory(false)} />
          <div className="ml-auto relative w-80 bg-brand-card border-l border-zinc-800 flex flex-col h-full animate-fadeIn">
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <h3 className="text-sm font-semibold text-white">History</h3>
              {history.length > 0 && (
                <button
                  onClick={clearHistory}
                  className="flex items-center gap-1 text-xs text-zinc-500 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-zinc-600">
                  <Clock className="w-6 h-6 mb-2" />
                  <p className="text-xs">No history yet</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {history.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => loadHistoryItem(item)}
                      className="w-full text-left p-3 rounded-lg hover:bg-zinc-800/50 transition-colors group"
                    >
                      <p className="text-xs font-mono text-zinc-300 truncate group-hover:text-white">
                        {item.input}
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px] text-zinc-600">
                          {new Date(item.timestamp).toLocaleString()}
                        </span>
                        <ChevronRight className="w-3 h-3 text-zinc-600 group-hover:text-brand-green" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
