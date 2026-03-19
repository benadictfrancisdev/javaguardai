import React, { useState } from 'react';
import { submitStackTrace } from '../api/client';
import { RiskBadge, RiskMeter } from '../components/RiskBadge';
import { Play, Loader2, AlertCircle, Target, Lightbulb, Briefcase, Timer } from 'lucide-react';

const sampleStackTrace = `java.lang.NullPointerException: Cannot invoke method getName() on null object
    at com.example.service.UserService.processUser(UserService.java:142)
    at com.example.controller.UserController.getUser(UserController.java:58)
    at sun.reflect.NativeMethodAccessorImpl.invoke0(Native Method)
    at org.springframework.web.servlet.FrameworkServlet.service(FrameworkServlet.java:897)
    at javax.servlet.http.HttpServlet.service(HttpServlet.java:750)
    at org.apache.catalina.core.StandardWrapperValve.invoke(StandardWrapperValve.java:202)
    at org.apache.catalina.core.StandardContextValve.invoke(StandardContextValve.java:97)
    at org.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:166)`;

export default function Analyzer() {
  const [stackTrace, setStackTrace] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const handleAnalyze = async () => {
    if (!stackTrace.trim()) {
      setError('Please enter a stack trace');
      return;
    }

    setError('');
    setLoading(true);
    setResult(null);

    try {
      // Extract exception class from first line
      const firstLine = stackTrace.split('\n')[0] || '';
      const exceptionMatch = firstLine.match(/^([a-zA-Z0-9_.]+Exception|[a-zA-Z0-9_.]+Error)/);
      const exceptionClass = exceptionMatch ? exceptionMatch[1] : 'Unknown Exception';
      
      // Submit for analysis
      const response = await submitStackTrace({
        exception_class: exceptionClass,
        message: firstLine.replace(exceptionClass + ':', '').trim() || 'Error occurred',
        stack_trace: stackTrace,
        heap_used_mb: 512,
        thread_count: 48,
        timestamp: new Date().toISOString()
      });

      // Poll for results
      const startTime = Date.now();
      const timeout = 60000; // 60 seconds timeout
      
      const pollForResult = async () => {
        if (Date.now() - startTime > timeout) {
          setResult({
            status: 'timeout',
            message: 'Analysis is taking longer than expected. Check the Incidents page for results.'
          });
          setLoading(false);
          return;
        }

        try {
          const { getIncident } = await import('../api/client');
          const incident = await getIncident(response.incident_id);
          
          if (incident.status === 'analysed' || incident.status === 'error') {
            setResult(incident);
            setLoading(false);
          } else {
            setTimeout(pollForResult, 2000);
          }
        } catch {
          setTimeout(pollForResult, 2000);
        }
      };

      pollForResult();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to analyze stack trace');
      setLoading(false);
    }
  };

  const analysis = result?.analysis || {};

  return (
    <div className="space-y-6" data-testid="analyzer-page">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Stack Trace Analyzer</h1>
        <p className="text-zinc-500">Paste a Java stack trace for AI-powered analysis</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input */}
        <div className="space-y-4">
          <div className="bg-brand-card border border-zinc-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-zinc-400">Stack Trace</label>
              <button
                onClick={() => setStackTrace(sampleStackTrace)}
                className="text-xs text-brand-green hover:text-brand-green/80 transition-colors"
                data-testid="use-sample"
              >
                Use Sample
              </button>
            </div>
            <textarea
              value={stackTrace}
              onChange={(e) => setStackTrace(e.target.value)}
              placeholder="Paste your Java stack trace here..."
              className="w-full h-64 p-4 rounded-lg bg-zinc-900 border border-zinc-700 text-white font-mono text-sm placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-green/50 resize-none"
              data-testid="stacktrace-input"
            />
            
            {error && (
              <div className="flex items-center gap-2 mt-3 p-3 rounded-lg bg-red-900/20 text-red-400 text-sm border border-red-800">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              onClick={handleAnalyze}
              disabled={loading || !stackTrace.trim()}
              className="w-full mt-4 py-3 rounded-lg bg-brand-green text-brand-dark font-semibold hover:bg-brand-green/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              data-testid="analyze-btn"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  Analyze
                </>
              )}
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-4">
          {loading && !result && (
            <div className="bg-brand-card border border-zinc-800 rounded-xl p-12 flex flex-col items-center justify-center">
              <Loader2 className="w-12 h-12 text-brand-green animate-spin mb-4" />
              <p className="text-white font-medium">Analyzing stack trace...</p>
              <p className="text-sm text-zinc-500 mt-1">AI is examining the error patterns</p>
            </div>
          )}

          {result && result.status !== 'timeout' && (
            <>
              {/* Risk Score */}
              <div className="bg-brand-card border border-zinc-800 rounded-xl p-5 flex items-center gap-6">
                <RiskMeter score={result.risk_score} />
                <div>
                  <h3 className="text-lg font-bold text-white">Risk Assessment</h3>
                  <p className="text-sm text-zinc-500 mt-1">
                    {analysis.error_type || 'Error analyzed'}
                  </p>
                  <div className="flex items-center gap-3 mt-2">
                    <RiskBadge score={result.risk_score} />
                    {analysis.confidence && (
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        analysis.confidence === 'high' ? 'bg-green-900/30 text-green-400' :
                        analysis.confidence === 'medium' ? 'bg-yellow-900/30 text-yellow-400' :
                        'bg-red-900/30 text-red-400'
                      }`}>
                        {analysis.confidence?.toUpperCase()} CONFIDENCE
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Analysis Cards */}
              {analysis.business_impact && (
                <div className="bg-brand-card border border-zinc-800 rounded-xl p-5">
                  <div className="flex items-center gap-2 text-red-400 mb-2">
                    <Briefcase className="w-4 h-4" />
                    <span className="text-sm font-semibold">WHAT BROKE</span>
                  </div>
                  <p className="text-sm text-zinc-300">{analysis.business_impact}</p>
                </div>
              )}

              {analysis.root_cause && (
                <div className="bg-brand-card border border-zinc-800 rounded-xl p-5">
                  <div className="flex items-center gap-2 text-yellow-400 mb-2">
                    <Target className="w-4 h-4" />
                    <span className="text-sm font-semibold">WHY IT HAPPENED</span>
                  </div>
                  <p className="text-sm text-zinc-300">{analysis.root_cause}</p>
                </div>
              )}

              {analysis.fix_suggestion && (
                <div className="bg-brand-card border border-zinc-800 rounded-xl p-5">
                  <div className="flex items-center gap-2 text-brand-green mb-2">
                    <Lightbulb className="w-4 h-4" />
                    <span className="text-sm font-semibold">HOW TO FIX</span>
                  </div>
                  <p className="text-sm text-zinc-300">{analysis.fix_suggestion}</p>
                </div>
              )}

              {analysis.estimated_fix_minutes && (
                <div className="flex items-center gap-2 text-sm text-zinc-500">
                  <Timer className="w-4 h-4" />
                  Estimated fix time: {analysis.estimated_fix_minutes} minutes
                </div>
              )}
            </>
          )}

          {result && result.status === 'timeout' && (
            <div className="bg-brand-card border border-yellow-800 rounded-xl p-5">
              <div className="flex items-center gap-2 text-yellow-400 mb-2">
                <AlertCircle className="w-5 h-5" />
                <span className="font-semibold">Analysis in Progress</span>
              </div>
              <p className="text-sm text-zinc-400">{result.message}</p>
            </div>
          )}

          {!loading && !result && (
            <div className="bg-brand-card border border-zinc-800 rounded-xl p-12 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
                <Play className="w-8 h-8 text-zinc-600" />
              </div>
              <p className="text-zinc-400">Paste a stack trace and click Analyze</p>
              <p className="text-sm text-zinc-600 mt-1">AI will identify the root cause and suggest fixes</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
