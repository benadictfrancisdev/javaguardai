import Editor, { OnMount } from '@monaco-editor/react';
import { useRef, useCallback } from 'react';
import type { editor } from 'monaco-editor';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  onCursorChange?: (line: number, column: number) => void;
  language?: string;
  readOnly?: boolean;
  height?: string;
  errorLines?: number[];
}

export default function CodeEditor({
  value,
  onChange,
  onCursorChange,
  language = 'java',
  readOnly = false,
  height = '100%',
  errorLines = [],
}: CodeEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const decorationsRef = useRef<editor.IEditorDecorationsCollection | null>(null);

  const handleEditorMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;

    // Set VS Code dark theme
    monaco.editor.defineTheme('java-ai-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6A9955' },
        { token: 'keyword', foreground: '569CD6' },
        { token: 'string', foreground: 'CE9178' },
        { token: 'number', foreground: 'B5CEA8' },
        { token: 'type', foreground: '4EC9B0' },
      ],
      colors: {
        'editor.background': '#1e1e1e',
        'editor.foreground': '#d4d4d4',
        'editorLineNumber.foreground': '#858585',
        'editorLineNumber.activeForeground': '#c6c6c6',
        'editor.selectionBackground': '#264f78',
        'editor.lineHighlightBackground': '#2a2d2e',
      },
    });
    monaco.editor.setTheme('java-ai-dark');

    editor.onDidChangeCursorPosition((e) => {
      onCursorChange?.(e.position.lineNumber, e.position.column);
    });

    // Add error decorations
    if (errorLines.length > 0) {
      decorationsRef.current = editor.createDecorationsCollection(
        errorLines.map((line) => ({
          range: new monaco.Range(line, 1, line, 1),
          options: {
            isWholeLine: true,
            className: 'error-line-decoration',
            glyphMarginClassName: 'error-glyph-margin',
            overviewRuler: {
              color: '#ff0000',
              position: monaco.editor.OverviewRulerLane.Full,
            },
          },
        }))
      );
    }

    editor.focus();
  }, [onCursorChange, errorLines]);

  // Update decorations when errorLines change
  const updateDecorations = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const monaco = (window as { monaco?: typeof import('monaco-editor') }).monaco;
    if (!monaco) return;

    if (decorationsRef.current) {
      decorationsRef.current.clear();
    }

    if (errorLines.length > 0) {
      decorationsRef.current = editor.createDecorationsCollection(
        errorLines.map((line) => ({
          range: new monaco.Range(line, 1, line, 1),
          options: {
            isWholeLine: true,
            className: 'error-line-decoration',
            glyphMarginClassName: 'error-glyph-margin',
          },
        }))
      );
    }
  }, [errorLines]);

  // Call updateDecorations when errorLines change
  if (editorRef.current && errorLines.length >= 0) {
    updateDecorations();
  }

  return (
    <div className="h-full w-full">
      <Editor
        height={height}
        language={language}
        value={value}
        onChange={(val) => onChange(val || '')}
        onMount={handleEditorMount}
        options={{
          readOnly,
          minimap: { enabled: true },
          fontSize: 14,
          lineNumbers: 'on',
          renderLineHighlight: 'all',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 4,
          wordWrap: 'off',
          glyphMargin: true,
          folding: true,
          bracketPairColorization: { enabled: true },
          formatOnPaste: true,
          suggestOnTriggerCharacters: true,
          scrollbar: {
            verticalScrollbarSize: 10,
            horizontalScrollbarSize: 10,
          },
          padding: { top: 8 },
        }}
        theme="vs-dark"
      />
    </div>
  );
}
