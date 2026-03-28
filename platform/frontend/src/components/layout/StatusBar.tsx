import { GitBranch, Circle } from 'lucide-react';
import type { SnippetStatus } from '../../types';

interface StatusBarProps {
  status: SnippetStatus | null;
  executionTime: number | null;
  language: string;
  line: number;
  column: number;
}

const statusColors: Record<string, string> = {
  success: 'text-green-400',
  compilation_error: 'text-red-400',
  runtime_error: 'text-red-400',
  timeout: 'text-yellow-400',
  compiling: 'text-blue-400',
  running: 'text-blue-400',
  pending: 'text-[#999]',
  analyzed: 'text-green-400',
};

const statusLabels: Record<string, string> = {
  success: 'Success',
  compilation_error: 'Compilation Error',
  runtime_error: 'Runtime Error',
  timeout: 'Timeout',
  compiling: 'Compiling...',
  running: 'Running...',
  pending: 'Ready',
  analyzed: 'Analyzed',
};

export default function StatusBar({ status, executionTime, language, line, column }: StatusBarProps) {
  return (
    <div className="h-6 bg-[#007acc] flex items-center justify-between px-3 text-white text-[11px] select-none">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1">
          <GitBranch size={12} />
          <span>main</span>
        </div>
        {status && (
          <div className={`flex items-center gap-1 ${statusColors[status] || 'text-white'}`}>
            <Circle size={8} fill="currentColor" />
            <span>{statusLabels[status] || status}</span>
          </div>
        )}
        {executionTime !== null && (
          <span className="text-white/70">{executionTime}ms</span>
        )}
      </div>
      <div className="flex items-center gap-4">
        <span>Ln {line}, Col {column}</span>
        <span>{language}</span>
        <span>UTF-8</span>
      </div>
    </div>
  );
}
