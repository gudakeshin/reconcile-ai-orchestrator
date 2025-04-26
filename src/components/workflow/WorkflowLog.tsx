
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Workflow } from "lucide-react";

interface WorkflowEvent {
  id: string;
  timestamp: string;
  agent: string;
  action: string;
  status: "completed" | "in-progress" | "pending" | "error";
  details?: string;
}

// Sample workflow data - in a real app this would come from a store/context
const workflowEvents: WorkflowEvent[] = [
  {
    id: "wf-001",
    timestamp: new Date(Date.now() - 120000).toISOString(),
    agent: "Data Extraction & Cleansing",
    action: "File ingestion",
    status: "completed",
    details: "Successfully parsed 2 Excel files"
  },
  {
    id: "wf-002",
    timestamp: new Date(Date.now() - 90000).toISOString(),
    agent: "Classifier",
    action: "Transaction categorization",
    status: "completed",
    details: "98.5% classification accuracy"
  },
  {
    id: "wf-003",
    timestamp: new Date(Date.now() - 60000).toISOString(),
    agent: "Reconciliation",
    action: "Transaction matching",
    status: "completed",
    details: "458 matches found, 3 exceptions identified"
  },
  {
    id: "wf-004",
    timestamp: new Date(Date.now() - 30000).toISOString(), 
    agent: "Routing",
    action: "Exception processing",
    status: "completed",
    details: "3 exceptions routed to Finance team"
  },
  {
    id: "wf-005",
    timestamp: new Date().toISOString(),
    agent: "Supervisor",
    action: "Report generation",
    status: "in-progress",
    details: "Compiling reconciliation report"
  }
];

export function WorkflowLog() {
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  };

  const getStatusColor = (status: WorkflowEvent["status"]) => {
    switch (status) {
      case "completed":
        return "bg-green-500";
      case "in-progress":
        return "bg-blue-500";
      case "pending":
        return "bg-amber-500";
      case "error":
        return "bg-destructive";
      default:
        return "bg-muted";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Workflow className="h-5 w-5 text-primary" />
          Workflow Log
        </CardTitle>
        <CardDescription>Real-time agent activity</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[320px] pr-4">
          <div className="relative">
            <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-muted-foreground/20" />
            <div className="space-y-6">
              {workflowEvents.map((event) => (
                <div key={event.id} className="relative pl-6">
                  <div className={`absolute left-0 top-2 w-4 h-4 rounded-full border-2 border-background ${getStatusColor(event.status)}`} />
                  <div>
                    <div className="flex items-baseline justify-between mb-1">
                      <h4 className="text-sm font-medium">{event.agent}</h4>
                      <span className="text-xs text-muted-foreground">{formatTimestamp(event.timestamp)}</span>
                    </div>
                    <p className="text-sm mb-1">{event.action}</p>
                    {event.details && (
                      <p className="text-xs text-muted-foreground">{event.details}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
