import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { IncidentCard } from '../components/dashboard/IncidentCard';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Skeleton } from '../components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  Search, 
  RefreshCw,
  AlertTriangle 
} from 'lucide-react';

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchIncidents = async () => {
    try {
      const status = statusFilter === 'all' ? null : statusFilter;
      const response = await api.getIncidents(status, 100);
      setIncidents(response.incidents);
    } catch (error) {
      console.error('Failed to fetch incidents:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [statusFilter]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchIncidents();
  };

  const filteredIncidents = incidents.filter(incident => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      incident.exception_class.toLowerCase().includes(query) ||
      incident.message.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-48" />
        </div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="incidents-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Incidents</h1>
          <p className="text-muted-foreground">
            {filteredIncidents.length} incidents found
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
          data-testid="refresh-incidents-btn"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by exception or message..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="search-incidents"
          />
        </div>
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList>
            <TabsTrigger value="all" data-testid="filter-all">All</TabsTrigger>
            <TabsTrigger value="received" data-testid="filter-received">Received</TabsTrigger>
            <TabsTrigger value="analysed" data-testid="filter-analysed">Analysed</TabsTrigger>
            <TabsTrigger value="resolved" data-testid="filter-resolved">Resolved</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Incidents List */}
      {filteredIncidents.length > 0 ? (
        <div className="space-y-4">
          {filteredIncidents.map((incident, index) => (
            <div 
              key={incident.id}
              className={`animate-fade-in-up`}
              style={{ animationDelay: `${index * 0.05}s`, opacity: 0 }}
            >
              <IncidentCard incident={incident} />
            </div>
          ))}
        </div>
      ) : (
        <div className="h-64 flex items-center justify-center">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-lg font-medium">No incidents found</p>
            <p className="text-muted-foreground mt-1">
              {searchQuery 
                ? 'Try adjusting your search query'
                : 'No incidents match the current filter'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
