import { useState, useCallback, useRef } from 'react';
import { Play, Upload, RotateCcw, FileCode } from 'lucide-react';
import CodeEditor from '../components/editor/CodeEditor';
import ErrorPanel from '../components/panels/ErrorPanel';
import AIPanel from '../components/panels/AIPanel';
import StatusBar from '../components/layout/StatusBar';
import { codeAPI } from '../services/api';
import toast from 'react-hot-toast';
import type { AIAnalysis, ErrorLog, ExecutionResult } from '../types';

const DEFAULT_CODE = `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, Java AI!");
        
        // Try introducing an error to see AI analysis
        // For example: remove a semicolon or misspell a method
    }
}`;

export default function EditorPage() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [title, setTitle] = useState('Main.java');
  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [execution, setExecution] = useState<ExecutionResult | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFixLoading, setIsFixLoading] = useState(false);
  const [cursorLine, setCursorLine] = useState(1);
  const [cursorCol, setCursorCol] = useState(1);
  const [snippetId, setSnippetId] = useState<string | null>(null);
  const [status, setStatus] = useState<ExecutionResult['status'] | null>('pending');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const errorLines = errors
    .filter(e => e.error_line)
    .map(e => e.error_line!);

  const handleSubmit = useCallback(async () => {
    if (!code.trim()) {
      toast.error('Please enter some Java code');
      return;
    }
    setIsLoading(true);
    setStatus('compiling');
    setErrors([]);
    setExecution(null);
    setAiAnalysis(null);

    try {
      const { data } = await codeAPI.submit({
        source_code: code,
        title: title.replace('.java', ''),
      });

      setSnippetId(data.snippet.id);
      setExecution(data.execution);
      setErrors(data.errors || []);
      setAiAnalysis(data.aiAnalysis);
      setStatus(data.execution.status);

      if (data.execution.status === 'success') {
        toast.success('Code executed successfully!');
      } else if (data.errors.length > 0) {
        toast.error(`Found ${data.errors.length} error(s)`);
      }

      if (data.warnings && data.warnings.length > 0) {
        data.warnings.forEach((w: string) => toast(w, { icon: '⚠️' }));
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      toast.error(axiosErr.response?.data?.error || 'Submission failed');
      setStatus('pending');
    } finally {
      setIsLoading(false);
    }
  }, [code, title]);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.java')) {
      toast.error('Only .java files are supported');
      return;
    }

    const text = await file.text();
    setCode(text);
    setTitle(file.name);
    toast.success(`Loaded ${file.name}`);
  }, []);

  const handleRequestFix = useCallback(async () => {
    if (!snippetId) {
      toast.error('Submit code first to get a fix');
      return;
    }
    setIsFixLoading(true);
    try {
      const { data } = await codeAPI.getFix(snippetId);
      if (data.fixedCode) {
        setAiAnalysis(prev => prev ? { ...prev, fixedCode: data.fixedCode } : {
          summary: 'Fix generated',
          errors: [],
          fixedCode: data.fixedCode,
          explanation: data.explanation,
          suggestions: [],
          codeQuality: { score: 0, readability: 'fair', maintainability: 'fair', performance: 'fair' },
          fromCache: false,
          responseTimeMs: 0,
        });
        toast.success('Fix generated!');
      }
    } catch {
      toast.error('Failed to generate fix');
    } finally {
      setIsFixLoading(false);
    }
  }, [snippetId]);

  const handleRequestOptimize = useCallback(async () => {
    if (!snippetId) {
      toast.error('Submit code first to optimize');
      return;
    }
    setIsFixLoading(true);
    try {
      const { data } = await codeAPI.optimize(snippetId);
      if (data.optimizedCode) {
        setAiAnalysis(prev => prev ? { ...prev, fixedCode: data.optimizedCode, suggestions: data.changes || [] } : null);
        toast.success('Optimization complete!');
      }
    } catch {
      toast.error('Failed to optimize');
    } finally {
      setIsFixLoading(false);
    }
  }, [snippetId]);

  const handleApplyFix = useCallback((fixedCode: string) => {
    setCode(fixedCode);
    toast.success('Fix applied to editor');
  }, []);

  const handleReset = useCallback(() => {
    setCode(DEFAULT_CODE);
    setTitle('Main.java');
    setErrors([]);
    setExecution(null);
    setAiAnalysis(null);
    setSnippetId(null);
    setStatus('pending');
    toast.success('Editor reset');
  }, []);

  return (
    <div className="flex-1 flex flex-col bg-[#1e1e1e] overflow-hidden">
      {/* Toolbar */}
      <div className="h-10 bg-[#252526] border-b border-[#333] flex items-center px-3 gap-2 shrink-0">
        <div className="flex items-center gap-1 bg-[#1e1e1e] rounded px-2 py-1">
          <FileCode size={14} className="text-[#999]" />
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-transparent text-xs text-white border-none outline-none w-32"
          />
        </div>

        <div className="flex-1" />

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept=".java"
          className="hidden"
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1 px-2.5 py-1 text-[11px] bg-[#333] hover:bg-[#444] text-white rounded transition-colors"
        >
          <Upload size={12} />
          Upload
        </button>

        <button
          onClick={handleReset}
          className="flex items-center gap-1 px-2.5 py-1 text-[11px] bg-[#333] hover:bg-[#444] text-white rounded transition-colors"
        >
          <RotateCcw size={12} />
          Reset
        </button>

        <button
          onClick={handleSubmit}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-4 py-1 text-[11px] bg-green-600 hover:bg-green-500 text-white rounded font-medium transition-colors disabled:opacity-50"
        >
          {isLoading ? (
            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Play size={12} fill="white" />
          )}
          {isLoading ? 'Running...' : 'Run & Analyze'}
        </button>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor + Error panel (vertical split) */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Code Editor */}
          <div className="flex-1 min-h-0">
            <CodeEditor
              value={code}
              onChange={setCode}
              onCursorChange={setCursorLine !== undefined ? (line, col) => { setCursorLine(line); setCursorCol(col); } : undefined}
              errorLines={errorLines}
            />
          </div>

          {/* Error Panel (bottom) */}
          <div className="h-48 shrink-0">
            <ErrorPanel
              errors={errors}
              execution={execution}
              isLoading={isLoading}
            />
          </div>
        </div>

        {/* AI Panel (right side) */}
        <div className="w-80 shrink-0">
          <AIPanel
            analysis={aiAnalysis}
            isLoading={isLoading || isFixLoading}
            onApplyFix={handleApplyFix}
            onRequestFix={handleRequestFix}
            onRequestOptimize={handleRequestOptimize}
          />
        </div>
      </div>

      {/* Status Bar */}
      <StatusBar
        status={status}
        executionTime={execution?.executionTimeMs || null}
        language="Java"
        line={cursorLine}
        column={cursorCol}
      />
    </div>
  );
}
