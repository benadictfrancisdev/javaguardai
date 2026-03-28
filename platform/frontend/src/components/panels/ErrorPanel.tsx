import { AlertTriangle, CheckCircle, Info, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import type { ErrorLog, ExecutionResult } from '../../types';

interface ErrorPanelProps {
  errors: ErrorLog[];
  execution: ExecutionResult | null;
  isLoading: boolean;
  onErrorClick?: (line: number) => void;
}

const severityIcons = {
  error: <XCircle size={14} className="text-red-400" />,
  warning: <AlertTriangle size={14} className="text-yellow-400" />,
  info: <Info size={14} className="text-blue-400" />,
};

const tabItems = ['Problems', 'Output', 'Terminal'] as const;

export default function ErrorPanel({ errors, execution, isLoading, onErrorClick }: ErrorPanelProps) {
  const [activeTab, setActiveTab] = useState<typeof tabItems[number]>('Problems');
  const [isCollapsed, setIsCollapsed] = useState(false);

  const errorCount = errors.filter(e => e.severity === 'error').length;
  const warningCount = errors.filter(e => e.severity === 'warning').length;

  if (isCollapsed) {
    return (
      <div
        className="h-8 bg-[#1e1e1e] border-t border-[#333] flex items-center px-3 cursor-pointer select-none"
        onClick={() => setIsCollapsed(false)}
      >
        <ChevronUp size={14} className="text-[#999] mr-2" />
        <span className="text-xs text-[#999]">PROBLEMS</span>
        {errorCount > 0 && <span className="ml-2 text-xs text-red-400">{errorCount} errors</span>}
        {warningCount > 0 && <span className="ml-2 text-xs text-yellow-400">{warningCount} warnings</span>}
      </div>
    );
  }

  return (
    <div className="h-full bg-[#1e1e1e] border-t border-[#333] flex flex-col">
      {/* Tab bar */}
      <div className="h-9 flex items-center border-b border-[#333] px-2 shrink-0">
        {tabItems.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'text-white border-white'
                : 'text-[#999] border-transparent hover:text-white'
            }`}
          >
            {tab}
            {tab === 'Problems' && errors.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded-full text-[10px]">
                {errors.length}
              </span>
            )}
          </button>
        ))}
        <div className="flex-1" />
        <button onClick={() => setIsCollapsed(true)} className="p-1 text-[#999] hover:text-white">
          <ChevronDown size={14} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-2">
        {isLoading ? (
          <div className="flex items-center gap-2 p-3">
            <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-[#999]">Analyzing code...</span>
          </div>
        ) : activeTab === 'Problems' ? (
          errors.length === 0 ? (
            <div className="flex items-center gap-2 p-3 text-xs text-green-400">
              <CheckCircle size={14} />
              <span>No problems detected</span>
            </div>
          ) : (
            <div className="space-y-0.5">
              {errors.map((error) => (
                <div
                  key={error.id}
                  className="flex items-start gap-2 px-2 py-1.5 hover:bg-[#2a2d2e] rounded cursor-pointer text-xs"
                  onClick={() => error.error_line && onErrorClick?.(error.error_line)}
                >
                  {severityIcons[error.severity] || severityIcons.error}
                  <div className="flex-1 min-w-0">
                    <span className="text-[#d4d4d4]">{error.error_message}</span>
                    <div className="flex items-center gap-2 mt-0.5 text-[#999]">
                      <span className="uppercase text-[10px] px-1 py-0.5 bg-[#333] rounded">{error.error_type}</span>
                      {error.error_line && <span>Line {error.error_line}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : activeTab === 'Output' ? (
          <div className="font-mono text-xs text-[#d4d4d4] whitespace-pre-wrap p-2">
            {execution ? (
              <>
                {execution.compilationOutput && (
                  <div>
                    <div className="text-[#569cd6] mb-1">--- Compilation Output ---</div>
                    <div className={execution.status === 'compilation_error' ? 'text-red-400' : 'text-green-400'}>
                      {execution.compilationOutput || 'Compilation successful'}
                    </div>
                  </div>
                )}
                {execution.executionOutput && (
                  <div className="mt-2">
                    <div className="text-[#569cd6] mb-1">--- Execution Output ---</div>
                    <div>{execution.executionOutput}</div>
                  </div>
                )}
                {!execution.compilationOutput && !execution.executionOutput && (
                  <span className="text-[#999]">No output</span>
                )}
              </>
            ) : (
              <span className="text-[#999]">Run your code to see output here</span>
            )}
          </div>
        ) : (
          <div className="font-mono text-xs text-[#999] p-2">
            Terminal output will appear here...
          </div>
        )}
      </div>
    </div>
  );
}
