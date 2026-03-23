import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { RiskBadge, RiskIndicator } from '../components/dashboard/RiskBadge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { Separator } from '../components/ui/separator';
import { ScrollArea } from '../components/ui/scroll-area';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  CheckCircle, 
  RefreshCw, 
  Clock,
  AlertTriangle,
  Lightbulb,
  Target,
  Briefcase,
  Timer,
  HelpCircle,
  ListOrdered,
  Code
} from 'lucide-react';
import { formatDate, cn } from '../lib/utils';

export default function IncidentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);
  const [reanalysing, setReanalysing] = useState(false);

  const fetchIncident = async () => {
    try {
      const data = await api.getIncident(id);
      setIncident(data);
    } catch (error) {
      console.error('Failed to fetch incident:', error);
      toast.error('Failed to load incident');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncident();
    const interval = setInterval(fetchIncident, 10000); // Poll for updates
    return () => clearInterval(interval);
  }, [id]);

  const handleResolve = async () => {
    setResolving(true);
    try {
      await api.resolveIncident(id);
      setIncident(prev => ({ ...prev, status: 'resolved' }));
      toast.success('Incident marked as resolved');
    } catch (error) {
      toast.error('Failed to resolve incident');
    } finally {
      setResolving(false);
    }
  };

  const handleReanalyse = async () => {
    setReanalysing(true);
    try {
      await api.reanalyseIncident(id);
      setIncident(prev => ({ ...prev, status: 'received' }));
      toast.success('Re-analysis queued');
    } catch (error) {
      toast.error('Failed to queue re-analysis');
    } finally {
      setReanalysing(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-lg font-medium">Incident not found</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/incidents')}>
            Back to Incidents
          </Button>
        </div>
      </div>
    );
  }

  const analysis = incident.analysis || {};

  return (
    <div className="space-y-6" data-testid="incident-detail-page">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/incidents')}
            data-testid="back-btn"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-black tracking-tight font-mono">
                {incident.exception_class}
              </h1>
              <Badge 
                variant="outline" 
                className={cn(
                  incident.status === 'resolved' && 'text-green-400 border-green-400/30',
                  incident.status === 'analysed' && 'text-blue-400 border-blue-400/30',
                  incident.status === 'received' && 'text-yellow-400 border-yellow-400/30',
                  incident.status === 'error' && 'text-red-400 border-red-400/30'
                )}
              >
                {incident.status}
              </Badge>
            </div>
            <p className="text-muted-foreground">{incident.message}</p>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {formatDate(incident.timestamp)}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {incident.status !== 'resolved' && (
            <>
              <Button
                variant="outline"
                onClick={handleReanalyse}
                disabled={reanalysing || incident.status === 'received'}
                data-testid="reanalyse-btn"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${reanalysing ? 'animate-spin' : ''}`} />
                Re-analyse
              </Button>
              <Button
                onClick={handleResolve}
                disabled={resolving}
                data-testid="resolve-btn"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Mark Resolved
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Risk Score Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="tracing-beam">
          <CardHeader>
            <CardTitle className="text-base">Risk Assessment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Risk Score</span>
              <RiskBadge score={incident.risk_score} size="lg" />
            </div>
            {incident.risk_score !== null && (
              <RiskIndicator score={incident.risk_score} />
            )}
            {analysis.confidence && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Confidence</span>
                <Badge variant="outline" className="capitalize">
                  {analysis.confidence}
                </Badge>
              </div>
            )}
            {analysis.estimated_fix_minutes && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Est. Fix Time</span>
                <span className="flex items-center gap-1 font-mono">
                  <Timer className="w-4 h-4" />
                  {analysis.estimated_fix_minutes} min
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 tracing-beam">
          <CardHeader>
            <CardTitle className="text-base">System Metrics at Time of Error</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Heap Used</p>
                <p className="text-lg font-mono font-semibold">{incident.heap_used_mb} MB</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Thread Count</p>
                <p className="text-lg font-mono font-semibold">{incident.thread_count}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <p className="text-lg font-semibold capitalize">{incident.status}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">ID</p>
                <p className="text-sm font-mono truncate">{incident.id.slice(0, 8)}...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Analysis */}
      {incident.status === 'received' ? (
        <Card className="tracing-beam">
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center">
              <RefreshCw className="w-8 h-8 text-primary animate-spin mb-4" />
              <p className="text-lg font-medium">Analysing incident...</p>
              <p className="text-sm text-muted-foreground mt-1">
                AI is examining the stack trace
              </p>
            </div>
          </CardContent>
        </Card>
      ) : analysis && Object.keys(analysis).length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Root Cause */}
          {analysis.root_cause && (
            <Card className="tracing-beam">
              <CardHeader className="flex flex-row items-center gap-2">
                <Target className="w-5 h-5 text-destructive" />
                <CardTitle className="text-base">Root Cause</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">{analysis.root_cause}</p>
              </CardContent>
            </Card>
          )}

          {/* Why It Happened */}
          {analysis.why && (
            <Card className="tracing-beam">
              <CardHeader className="flex flex-row items-center gap-2">
                <HelpCircle className="w-5 h-5 text-yellow-400" />
                <CardTitle className="text-base">Why It Happened</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">{analysis.why}</p>
              </CardContent>
            </Card>
          )}

          {/* Fix Steps */}
          {analysis.fix_steps && (
            <Card className="tracing-beam">
              <CardHeader className="flex flex-row items-center gap-2">
                <ListOrdered className="w-5 h-5 text-blue-400" />
                <CardTitle className="text-base">Fix Steps</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed whitespace-pre-line">{analysis.fix_steps}</p>
              </CardContent>
            </Card>
          )}

          {/* Fix Suggestion */}
          {analysis.fix_suggestion && (
            <Card className="tracing-beam">
              <CardHeader className="flex flex-row items-center gap-2">
                <Lightbulb className="w-5 h-5 text-yellow-400" />
                <CardTitle className="text-base">Fix Suggestion</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">{analysis.fix_suggestion}</p>
              </CardContent>
            </Card>
          )}

          {/* Code Fix */}
          {analysis.code_fix && (
            <Card className="lg:col-span-2 tracing-beam">
              <CardHeader className="flex flex-row items-center gap-2">
                <Code className="w-5 h-5 text-green-400" />
                <CardTitle className="text-base">Code Fix</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="p-4 rounded-lg bg-secondary/50 text-sm font-mono whitespace-pre-wrap overflow-x-auto">
                  {analysis.code_fix}
                </pre>
              </CardContent>
            </Card>
          )}

          {/* Business Impact */}
          {analysis.business_impact && (
            <Card className="lg:col-span-2 tracing-beam">
              <CardHeader className="flex flex-row items-center gap-2">
                <Briefcase className="w-5 h-5 text-primary" />
                <CardTitle className="text-base">Business Impact</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">{analysis.business_impact}</p>
              </CardContent>
            </Card>
          )}
        </div>
      ) : null}

      {/* Stack Trace */}
      <Card className="tracing-beam">
        <CardHeader>
          <CardTitle className="text-base">Stack Trace</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64">
            <pre className="stack-trace p-4 rounded-lg bg-secondary/50 whitespace-pre-wrap">
              {incident.stack_trace || 'No stack trace available'}
            </pre>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
