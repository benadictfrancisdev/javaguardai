import React, { useState, useEffect } from 'react';
import { getIncidents } from '../api/client';
import { MessageSquare, Settings as SettingsIcon, DollarSign, Clock, AlertTriangle, Save, Send } from 'lucide-react';
import { toast } from 'sonner';

export default function Alerts() {
  const [slackWebhook, setSlackWebhook] = useState('');
  const [hourlyRate, setHourlyRate] = useState(100);
  const [companyName, setCompanyName] = useState('');
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [testingSlack, setTestingSlack] = useState(false);

  useEffect(() => {
    // Load saved settings
    const savedWebhook = localStorage.getItem('fg_slack_webhook') || '';
    const savedRate = localStorage.getItem('fg_hourly_rate') || '100';
    const customer = JSON.parse(localStorage.getItem('fg_customer') || '{}');
    
    setSlackWebhook(savedWebhook);
    setHourlyRate(Number(savedRate));
    setCompanyName(customer.company_name || '');

    // Fetch incidents for ROI calculation
    fetchIncidents();
  }, []);

  const fetchIncidents = async () => {
    try {
      const response = await getIncidents(null, 1000);
      setIncidents(response.incidents || []);
    } catch (error) {
      console.error('Failed to fetch incidents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSlack = () => {
    localStorage.setItem('fg_slack_webhook', slackWebhook);
    toast.success('Slack webhook saved');
  };

  const handleTestSlack = async () => {
    if (!slackWebhook) {
      toast.error('Please enter a webhook URL first');
      return;
    }

    setTestingSlack(true);
    try {
      await fetch(slackWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: '🛡️ FrameworkGuard AI Test Alert',
          blocks: [
            {
              type: 'header',
              text: { type: 'plain_text', text: '🛡️ Test Alert from FrameworkGuard AI' }
            },
            {
              type: 'section',
              text: { type: 'mrkdwn', text: 'This is a test message. Your Slack integration is working!' }
            }
          ]
        })
      });
      toast.success('Test message sent to Slack!');
    } catch {
      toast.error('Failed to send test message. Check your webhook URL.');
    } finally {
      setTestingSlack(false);
    }
  };

  const handleSaveSettings = () => {
    localStorage.setItem('fg_hourly_rate', hourlyRate.toString());
    toast.success('Settings saved');
  };

  // ROI Calculations
  const thisMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  const monthlyIncidents = incidents.filter(i => 
    i.created_at?.startsWith(thisMonth)
  ).length;
  
  const hoursPerIncident = 2; // Estimated hours saved per incident
  const hoursSaved = monthlyIncidents * hoursPerIncident;
  const moneySaved = hoursSaved * hourlyRate;

  return (
    <div className="space-y-6" data-testid="alerts-page">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Alerts & Settings</h1>
        <p className="text-zinc-500">Configure notifications and view ROI metrics</p>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Slack Integration */}
        <div className="bg-brand-card border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <MessageSquare className="w-5 h-5 text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-white">Slack Alerts</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1.5">Webhook URL</label>
              <input
                type="url"
                value={slackWebhook}
                onChange={(e) => setSlackWebhook(e.target.value)}
                placeholder="https://hooks.slack.com/services/..."
                className="w-full px-4 py-2.5 rounded-lg bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                data-testid="slack-webhook-input"
              />
              <p className="text-xs text-zinc-600 mt-1">
                Create an incoming webhook in your Slack workspace settings
              </p>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={handleSaveSlack}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 text-white hover:bg-zinc-700 transition-colors"
                data-testid="save-slack-btn"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
              <button
                onClick={handleTestSlack}
                disabled={testingSlack || !slackWebhook}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-500 transition-colors disabled:opacity-50"
                data-testid="test-slack-btn"
              >
                <Send className="w-4 h-4" />
                Test
              </button>
            </div>
          </div>
        </div>

        {/* Settings */}
        <div className="bg-brand-card border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-brand-green/20">
              <SettingsIcon className="w-5 h-5 text-brand-green" />
            </div>
            <h3 className="text-lg font-semibold text-white">Settings</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1.5">Company Name</label>
              <input
                type="text"
                value={companyName}
                disabled
                className="w-full px-4 py-2.5 rounded-lg bg-zinc-900/50 border border-zinc-800 text-zinc-400 cursor-not-allowed"
              />
            </div>
            
            <div>
              <label className="block text-sm text-zinc-400 mb-1.5">
                Blended Hourly Rate (₹)
              </label>
              <input
                type="number"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(Number(e.target.value))}
                min="0"
                className="w-full px-4 py-2.5 rounded-lg bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-green/50"
                data-testid="hourly-rate-input"
              />
              <p className="text-xs text-zinc-600 mt-1">
                Used for ROI calculations below
              </p>
            </div>
            
            <button
              onClick={handleSaveSettings}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-brand-green text-brand-dark font-medium hover:bg-brand-green/90 transition-colors"
              data-testid="save-settings-btn"
            >
              <Save className="w-4 h-4" />
              Save Settings
            </button>
          </div>
        </div>
      </div>

      {/* ROI Summary */}
      <div className="bg-brand-card border border-zinc-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">ROI Summary (This Month)</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-zinc-900/50 border border-zinc-800">
            <div className="flex items-center gap-2 text-zinc-400 mb-2">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm">Total Incidents</span>
            </div>
            <p className="text-3xl font-bold font-mono text-white">{monthlyIncidents}</p>
          </div>
          
          <div className="p-4 rounded-lg bg-zinc-900/50 border border-zinc-800">
            <div className="flex items-center gap-2 text-zinc-400 mb-2">
              <Clock className="w-4 h-4" />
              <span className="text-sm">Hours Saved</span>
            </div>
            <p className="text-3xl font-bold font-mono text-brand-green">{hoursSaved}</p>
            <p className="text-xs text-zinc-500 mt-1">@ {hoursPerIncident} hrs per incident</p>
          </div>
          
          <div className="p-4 rounded-lg bg-zinc-900/50 border border-zinc-800">
            <div className="flex items-center gap-2 text-zinc-400 mb-2">
              <DollarSign className="w-4 h-4" />
              <span className="text-sm">Value Saved</span>
            </div>
            <p className="text-3xl font-bold font-mono text-brand-green">
              ₹{moneySaved.toLocaleString()}
            </p>
            <p className="text-xs text-zinc-500 mt-1">@ ₹{hourlyRate}/hr</p>
          </div>
        </div>
        
        <div className="mt-4 p-4 rounded-lg bg-brand-green/10 border border-brand-green/20">
          <p className="text-sm text-brand-green">
            <strong>Impact:</strong> FrameworkGuard AI has helped your team save approximately{' '}
            <span className="font-mono font-bold">{hoursSaved} hours</span> of debugging time this month, 
            translating to <span className="font-mono font-bold">₹{moneySaved.toLocaleString()}</span> in productivity gains.
          </p>
        </div>
      </div>
    </div>
  );
}
