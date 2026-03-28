import { useState } from 'react';
import { Bot, Copy, Check, Lightbulb, Wrench, Zap, ChevronRight, Star, Sparkles } from 'lucide-react';
import type { AIAnalysis } from '../../types';

interface AIPanelProps {
  analysis: AIAnalysis | null;
  isLoading: boolean;
  onApplyFix?: (fixedCode: string) => void;
  onRequestFix?: () => void;
  onRequestOptimize?: () => void;
}

export default function AIPanel({ analysis, isLoading, onApplyFix, onRequestFix, onRequestOptimize }: AIPanelProps) {
  const [copied, setCopied] = useState(false);
  const [activeSection, setActiveSection] = useState<'analysis' | 'fix' | 'suggestions'>('analysis');

  const handleCopyFix = () => {
    if (analysis?.fixedCode) {
      navigator.clipboard.writeText(analysis.fixedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const qualityColor = (level: string) => {
    switch (level) {
      case 'good': return 'text-green-400';
      case 'fair': return 'text-yellow-400';
      case 'poor': return 'text-red-400';
      default: return 'text-[#999]';
    }
  };

  return (
    <div className="h-full bg-[#1e1e1e] border-l border-[#333] flex flex-col">
      {/* Header */}
      <div className="h-9 flex items-center px-3 border-b border-[#333] shrink-0">
        <Bot size={14} className="text-blue-400 mr-2" />
        <span className="text-xs font-medium text-white">AI Assistant</span>
        {analysis?.fromCache && (
          <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded">cached</span>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-1 p-2 border-b border-[#333] shrink-0">
        <button
          onClick={onRequestFix}
          disabled={isLoading}
          className="flex items-center gap-1 px-2 py-1 text-[11px] bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors disabled:opacity-50"
        >
          <Wrench size={12} />
          Fix Code
        </button>
        <button
          onClick={onRequestOptimize}
          disabled={isLoading}
          className="flex items-center gap-1 px-2 py-1 text-[11px] bg-[#333] hover:bg-[#444] text-white rounded transition-colors disabled:opacity-50"
        >
          <Zap size={12} />
          Optimize
        </button>
      </div>

      {/* Tab sections */}
      <div className="flex border-b border-[#333] shrink-0">
        {(['analysis', 'fix', 'suggestions'] as const).map((section) => (
          <button
            key={section}
            onClick={() => setActiveSection(section)}
            className={`flex-1 px-2 py-1.5 text-[11px] font-medium border-b-2 transition-colors capitalize ${
              activeSection === section
                ? 'text-white border-blue-400'
                : 'text-[#999] border-transparent hover:text-white'
            }`}
          >
            {section}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-3">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-32 gap-3">
            <div className="relative">
              <Sparkles size={24} className="text-blue-400 animate-pulse" />
            </div>
            <span className="text-xs text-[#999]">AI is analyzing your code...</span>
          </div>
        ) : !analysis ? (
          <div className="flex flex-col items-center justify-center h-32 gap-3 text-center">
            <Bot size={32} className="text-[#555]" />
            <div>
              <p className="text-xs text-[#999]">Submit your code to get</p>
              <p className="text-xs text-[#999]">AI-powered analysis</p>
            </div>
          </div>
        ) : activeSection === 'analysis' ? (
          <div className="space-y-4">
            {/* Summary */}
            {analysis.summary && (
              <div>
                <h3 className="text-[11px] font-semibold text-[#569cd6] uppercase mb-1.5">Summary</h3>
                <p className="text-xs text-[#d4d4d4] leading-relaxed">{analysis.summary}</p>
              </div>
            )}

            {/* Explanation */}
            {analysis.explanation && (
              <div>
                <h3 className="text-[11px] font-semibold text-[#569cd6] uppercase mb-1.5">Explanation</h3>
                <p className="text-xs text-[#d4d4d4] leading-relaxed whitespace-pre-wrap">{analysis.explanation}</p>
              </div>
            )}

            {/* Code Quality */}
            {analysis.codeQuality && analysis.codeQuality.score > 0 && (
              <div>
                <h3 className="text-[11px] font-semibold text-[#569cd6] uppercase mb-1.5">Code Quality</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#999] w-20">Score</span>
                    <div className="flex-1 bg-[#333] rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          analysis.codeQuality.score >= 70 ? 'bg-green-500' :
                          analysis.codeQuality.score >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${analysis.codeQuality.score}%` }}
                      />
                    </div>
                    <span className="text-xs text-white font-medium w-8">{analysis.codeQuality.score}</span>
                  </div>
                  {(['readability', 'maintainability', 'performance'] as const).map((metric) => (
                    <div key={metric} className="flex items-center gap-2">
                      <span className="text-xs text-[#999] w-20 capitalize">{metric}</span>
                      <span className={`text-xs font-medium capitalize ${qualityColor(analysis.codeQuality[metric])}`}>
                        {analysis.codeQuality[metric]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Errors */}
            {analysis.errors && analysis.errors.length > 0 && (
              <div>
                <h3 className="text-[11px] font-semibold text-[#569cd6] uppercase mb-1.5">Issues Found</h3>
                <div className="space-y-2">
                  {analysis.errors.map((error, idx) => (
                    <div key={idx} className="bg-[#2a2d2e] rounded p-2">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className={`text-[10px] px-1 py-0.5 rounded uppercase ${
                          error.severity === 'error' ? 'bg-red-500/20 text-red-400' :
                          error.severity === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-blue-500/20 text-blue-400'
                        }`}>
                          {error.severity}
                        </span>
                        {error.line && <span className="text-[10px] text-[#999]">Line {error.line}</span>}
                      </div>
                      <p className="text-xs text-[#d4d4d4] mb-1">{error.message}</p>
                      {error.explanation && (
                        <p className="text-[11px] text-[#999] mb-1">{error.explanation}</p>
                      )}
                      {error.suggestion && (
                        <div className="flex items-start gap-1 mt-1">
                          <Lightbulb size={12} className="text-yellow-400 mt-0.5 shrink-0" />
                          <p className="text-[11px] text-yellow-200">{error.suggestion}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Response time */}
            {analysis.responseTimeMs > 0 && (
              <p className="text-[10px] text-[#666]">Response time: {analysis.responseTimeMs}ms</p>
            )}
          </div>
        ) : activeSection === 'fix' ? (
          <div className="space-y-3">
            {analysis.fixedCode ? (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="text-[11px] font-semibold text-[#569cd6] uppercase">Fixed Code</h3>
                  <div className="flex gap-1">
                    <button
                      onClick={handleCopyFix}
                      className="flex items-center gap-1 px-2 py-1 text-[10px] bg-[#333] hover:bg-[#444] text-white rounded transition-colors"
                    >
                      {copied ? <Check size={10} /> : <Copy size={10} />}
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                    <button
                      onClick={() => onApplyFix?.(analysis.fixedCode!)}
                      className="flex items-center gap-1 px-2 py-1 text-[10px] bg-green-600 hover:bg-green-500 text-white rounded transition-colors"
                    >
                      <ChevronRight size={10} />
                      Apply Fix
                    </button>
                  </div>
                </div>
                <pre className="bg-[#0d1117] rounded p-3 text-xs text-[#d4d4d4] overflow-auto max-h-96 font-mono whitespace-pre-wrap">
                  {analysis.fixedCode}
                </pre>
              </>
            ) : (
              <div className="text-center py-8">
                <Wrench size={24} className="text-[#555] mx-auto mb-2" />
                <p className="text-xs text-[#999]">Click "Fix Code" to generate a fix</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {analysis.suggestions && analysis.suggestions.length > 0 ? (
              analysis.suggestions.map((suggestion, idx) => (
                <div key={idx} className="flex items-start gap-2 bg-[#2a2d2e] rounded p-2">
                  <Star size={12} className="text-yellow-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-[#d4d4d4]">{suggestion}</p>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Lightbulb size={24} className="text-[#555] mx-auto mb-2" />
                <p className="text-xs text-[#999]">No additional suggestions</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
