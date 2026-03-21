import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'https://javaguardai-production.up.railway.app';
import { Label } from '../components/ui/label';
import { Separator } from '../components/ui/separator';
import { toast } from 'sonner';
import { 
  Key, 
  Copy, 
  RefreshCw, 
  Eye, 
  EyeOff,
  Code,
  Terminal
} from 'lucide-react';

export default function SettingsPage() {
  const { user, regenerateApiKey } = useAuth();
  const [showApiKey, setShowApiKey] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const handleCopyApiKey = () => {
    navigator.clipboard.writeText(user?.api_key || '');
    toast.success('API key copied to clipboard');
  };

  const handleRegenerateApiKey = async () => {
    if (!window.confirm('Are you sure? This will invalidate your current API key.')) {
      return;
    }
    setRegenerating(true);
    try {
      await regenerateApiKey();
      toast.success('API key regenerated successfully');
    } catch (error) {
      toast.error('Failed to regenerate API key');
    } finally {
      setRegenerating(false);
    }
  };

  const displayApiKey = showApiKey 
    ? user?.api_key 
    : user?.api_key?.replace(/./g, '•').slice(0, 40) + '...';

  const sampleException = `curl -X POST ${API_URL}/api/exceptions \\
  -H "Content-Type: application/json" \\
  -d '{
    "api_key": "${user?.api_key || 'YOUR_API_KEY'}",
    "exception_class": "java.lang.NullPointerException",
    "message": "Cannot invoke method on null object",
    "stack_trace": "at com.example.Service.process(Service.java:42)",
    "heap_used_mb": 512,
    "thread_count": 48,
    "timestamp": "${new Date().toISOString()}"
  }'`;

  const sampleMetrics = `curl -X POST ${API_URL}/api/metrics \\
  -H "Content-Type: application/json" \\
  -d '{
    "api_key": "${user?.api_key || 'YOUR_API_KEY'}",
    "heap_used_mb": 512,
    "heap_max_mb": 1024,
    "thread_count": 48,
    "gc_count": 125,
    "jvm_uptime_ms": 3600000,
    "timestamp": "${new Date().toISOString()}"
  }'`;

  return (
    <div className="space-y-6 max-w-4xl" data-testid="settings-page">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your API key and integration</p>
      </div>

      {/* Account Info */}
      <Card className="tracing-beam">
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>Your account details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Company</Label>
              <p className="font-medium">{user?.company_name}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Email</Label>
              <p className="font-medium">{user?.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Key */}
      <Card className="tracing-beam">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            API Key
          </CardTitle>
          <CardDescription>
            Use this key to authenticate your application's requests
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Input
              readOnly
              value={displayApiKey}
              className="font-mono text-sm"
              data-testid="api-key-input"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowApiKey(!showApiKey)}
              data-testid="toggle-api-key"
            >
              {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleCopyApiKey}
              data-testid="copy-api-key"
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>
          <Button
            variant="destructive"
            onClick={handleRegenerateApiKey}
            disabled={regenerating}
            data-testid="regenerate-api-key"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${regenerating ? 'animate-spin' : ''}`} />
            Regenerate API Key
          </Button>
        </CardContent>
      </Card>

      {/* Integration Guide */}
      <Card className="tracing-beam">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="w-5 h-5" />
            Integration Guide
          </CardTitle>
          <CardDescription>
            Send exceptions and metrics from your Java application
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Exception Reporting */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Terminal className="w-4 h-4 text-muted-foreground" />
              <Label>Report Exception</Label>
            </div>
            <div className="relative">
              <pre className="p-4 rounded-lg bg-secondary/50 text-sm font-mono overflow-x-auto whitespace-pre-wrap">
                {sampleException}
              </pre>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => {
                  navigator.clipboard.writeText(sampleException);
                  toast.success('Copied to clipboard');
                }}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <Separator />

          {/* Metrics Reporting */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Terminal className="w-4 h-4 text-muted-foreground" />
              <Label>Report Metrics</Label>
            </div>
            <div className="relative">
              <pre className="p-4 rounded-lg bg-secondary/50 text-sm font-mono overflow-x-auto whitespace-pre-wrap">
                {sampleMetrics}
              </pre>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => {
                  navigator.clipboard.writeText(sampleMetrics);
                  toast.success('Copied to clipboard');
                }}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
