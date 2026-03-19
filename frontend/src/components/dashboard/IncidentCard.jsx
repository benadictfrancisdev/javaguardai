import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../ui/card';
import { RiskBadge } from './RiskBadge';
import { Badge } from '../ui/badge';
import { cn, formatDate } from '../../lib/utils';
import { AlertTriangle, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';

const statusConfig = {
  received: { icon: Clock, label: 'Received', color: 'text-yellow-400' },
  analysed: { icon: AlertTriangle, label: 'Analysed', color: 'text-blue-400' },
  resolved: { icon: CheckCircle, label: 'Resolved', color: 'text-green-400' },
  error: { icon: XCircle, label: 'Error', color: 'text-red-400' },
};

export const IncidentCard = ({ incident, compact = false }) => {
  const navigate = useNavigate();
  const status = statusConfig[incident.status] || statusConfig.received;
  const StatusIcon = status.icon;

  const handleClick = () => {
    navigate(`/incidents/${incident.id}`);
  };

  if (compact) {
    return (
      <div 
        className="incident-row flex items-center justify-between p-3 rounded-lg bg-card/50 border border-border"
        onClick={handleClick}
        data-testid={`incident-row-${incident.id}`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn('status-dot', incident.status)} />
          <div className="min-w-0">
            <p className="text-sm font-medium truncate font-mono">
              {incident.exception_class}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {incident.message?.slice(0, 60)}...
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <RiskBadge score={incident.risk_score} />
          <span className="text-xs text-muted-foreground">
            {formatDate(incident.timestamp)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <Card 
      className="tracing-beam cursor-pointer transition-transform duration-200 hover:scale-[1.01]"
      onClick={handleClick}
      data-testid={`incident-card-${incident.id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-2">
              <StatusIcon className={cn('w-4 h-4', status.color)} />
              <Badge variant="outline" className={status.color}>
                {status.label}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {formatDate(incident.timestamp)}
              </span>
            </div>
            <h3 className="font-mono text-sm font-semibold mb-1 truncate">
              {incident.exception_class}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {incident.message}
            </p>
            {incident.analysis?.root_cause && (
              <div className="mt-3 p-2 rounded bg-secondary/50">
                <p className="text-xs text-muted-foreground">Root Cause:</p>
                <p className="text-sm line-clamp-2">{incident.analysis.root_cause}</p>
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <RiskBadge score={incident.risk_score} size="lg" />
            {incident.status === 'received' && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" />
                Analysing...
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
