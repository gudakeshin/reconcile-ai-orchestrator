import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/common/EmptyState";

interface WorkflowEvent {
  id: string;
  timestamp: string;
  agent: string;
  action: string;
  status: 'completed' | 'in-progress' | 'failed';
  details: string;
}

export function WorkflowLog() {
  const [workflowEvents, setWorkflowEvents] = useState<WorkflowEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchWorkflowEvents = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/workflow/events');
        if (!response.ok) {
          throw new Error('Failed to fetch workflow events');
        }
        const data = await response.json();
        setWorkflowEvents(data);
      } catch (error) {
        console.error('Error fetching workflow events:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // Fetch initial events
    fetchWorkflowEvents();

    // Set up WebSocket connection for real-time updates
    const ws = new WebSocket('ws://localhost:8000/ws/workflow');
    
    ws.onmessage = (event) => {
      const newEvent = JSON.parse(event.data);
      setWorkflowEvents(prev => [newEvent, ...prev]);
    };

    return () => {
      ws.close();
    };
  }, []);

  const getStatusBadge = (status: 'completed' | 'in-progress' | 'failed') => {
    switch (status) {
      case 'completed':
        return (
          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
            Completed
          </Badge>
        );
      case 'in-progress':
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">
            In Progress
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
            Failed
          </Badge>
        );
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <Card className="h-[500px] flex flex-col">
      <CardHeader>
        <CardTitle className="text-lg">Workflow Log</CardTitle>
        <CardDescription>Recent reconciliation workflow events</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="text-center py-4">
            <p className="text-muted-foreground">Loading workflow events...</p>
          </div>
        ) : workflowEvents.length === 0 ? (
          <EmptyState message="No workflow events found. Upload files to begin reconciliation." />
        ) : (
          <div className="space-y-4">
            {workflowEvents.map((event) => (
              <div key={event.id} className="flex items-start gap-4">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{event.agent}</p>
                    {getStatusBadge(event.status)}
                  </div>
                  <p className="text-sm text-muted-foreground">{event.action}</p>
                  <p className="text-xs text-muted-foreground">{event.details}</p>
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatDate(event.timestamp)}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
