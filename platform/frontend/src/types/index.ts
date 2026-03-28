export interface User {
  id: string;
  email: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  is_active: boolean;
  total_analyses: number;
  total_fixes_applied: number;
  created_at: string;
  last_login: string | null;
}

export interface AuthResponse {
  message: string;
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  language: string;
  is_archived: boolean;
  snippet_count: number;
  error_count: number;
  created_at: string;
  updated_at: string;
}

export interface CodeSnippet {
  id: string;
  user_id: string;
  project_id: string | null;
  title: string;
  source_code: string;
  language: string;
  file_name: string | null;
  status: SnippetStatus;
  compilation_output: string | null;
  execution_output: string | null;
  execution_time_ms: number | null;
  has_errors: boolean;
  created_at: string;
  updated_at: string;
  errors?: ErrorLog[];
  aiResponses?: AIResponse[];
}

export type SnippetStatus =
  | 'pending'
  | 'compiling'
  | 'running'
  | 'success'
  | 'compilation_error'
  | 'runtime_error'
  | 'timeout'
  | 'analyzed';

export interface ErrorLog {
  id: string;
  snippet_id: string;
  user_id: string;
  error_type: 'compilation' | 'runtime' | 'logical' | 'security' | 'performance';
  error_message: string;
  error_line: number | null;
  error_column: number | null;
  severity: 'error' | 'warning' | 'info';
  is_resolved: boolean;
  created_at: string;
}

export interface AIResponse {
  id: string;
  snippet_id: string;
  user_id: string;
  request_type: 'error_explanation' | 'code_fix' | 'optimization' | 'review' | 'full_analysis';
  model_used: string | null;
  tokens_used: number | null;
  response_time_ms: number | null;
  rating: number | null;
  fixed_code: string | null;
  explanation: string | null;
  suggestions: string[] | null;
  created_at: string;
}

export interface AIAnalysis {
  summary: string;
  errors: AIError[];
  fixedCode: string | null;
  explanation: string;
  suggestions: string[];
  codeQuality: CodeQuality;
  fromCache: boolean;
  responseTimeMs: number;
}

export interface AIError {
  type: string;
  severity: string;
  line: number | null;
  message: string;
  explanation: string;
  suggestion: string;
}

export interface CodeQuality {
  score: number;
  readability: 'good' | 'fair' | 'poor';
  maintainability: 'good' | 'fair' | 'poor';
  performance: 'good' | 'fair' | 'poor';
}

export interface ExecutionResult {
  status: SnippetStatus;
  compilationOutput: string;
  executionOutput: string;
  executionTimeMs: number;
}

export interface SubmitResponse {
  snippet: CodeSnippet;
  execution: ExecutionResult;
  errors: ErrorLog[];
  aiAnalysis: AIAnalysis | null;
  warnings: string[];
}

export interface DashboardStats {
  overview: {
    totalSnippets: number;
    totalErrors: number;
    resolvedErrors: number;
    unresolvedErrors: number;
    totalProjects: number;
    totalAIResponses: number;
    totalAnalyses: number;
    totalFixesApplied: number;
    errorResolutionRate: number;
  };
  errorDistribution: { error_type: string; count: string }[];
  statusDistribution: { status: string; count: string }[];
  dailyActivity: { date: string; count: string }[];
  recentSnippets: CodeSnippet[];
}
