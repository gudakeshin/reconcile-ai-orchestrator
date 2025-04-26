
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, AlertCircle, Clock, Play, Pause, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AgentDetails } from "./AgentDetails";

type AgentStatus = 'active' | 'inactive' | 'error';

export interface AgentData {
  name: string;
  description: string;
  status: AgentStatus;
  objective?: string;
  keyFunctions?: string[];
  roleDefinition?: string;
  goalSpecification?: string;
  capabilities?: string[];
  interactions?: string[];
  workflow?: string[];
  metrics?: string[];
  progress?: number;
  taskCount?: number;
  lastActive?: string;
}

interface AgentCardProps {
  agent: AgentData;
  icon: React.ReactNode;
}

export function AgentCard({ agent, icon }: AgentCardProps) {
  const { 
    name, 
    description, 
    status, 
    progress = 0, 
    taskCount = 0, 
    lastActive = 'Just now' 
  } = agent;

  const getStatusColor = (status: AgentStatus): string => {
    switch (status) {
      case 'active':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'inactive':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'error':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const getStatusIcon = (status: AgentStatus) => {
    switch (status) {
      case 'active':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'inactive':
        return <Clock className="h-4 w-4" />;
      case 'error':
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  return (
    <Card className={`agent-card ${status === 'active' ? 'agent-active' : status === 'error' ? 'agent-error' : 'agent-inactive'}`}>
      <CardHeader className="flex flex-row items-start justify-between pb-2">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <div className="h-6 w-6 text-primary">{icon}</div>
            <span>{name}</span>
          </CardTitle>
          <CardDescription className="line-clamp-2 mt-1">
            {description}
          </CardDescription>
        </div>
        <Badge
          className={`ml-2 ${getStatusColor(status)} flex items-center gap-1`}
          variant="outline"
        >
          {getStatusIcon(status)}
          <span>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
        </Badge>
      </CardHeader>
      
      <CardContent className="pb-2">
        {status === 'active' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Processing</span>
              <span className="font-medium">{progress}%</span>
            </div>
            <Progress value={progress} className="h-1" />
          </div>
        )}

        <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
          <div>Tasks: {taskCount}</div>
          <div>Last active: {lastActive}</div>
        </div>
      </CardContent>
      
      <CardFooter className="pt-2 flex justify-between">
        {status === 'active' ? (
          <Button variant="outline" size="sm" className="flex-1 mr-2" onClick={() => console.log(`Pause ${name}`)}>
            <Pause className="h-3.5 w-3.5 mr-1" />
            Pause
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="flex-1 mr-2" onClick={() => console.log(`Start ${name}`)}>
            <Play className="h-3.5 w-3.5 mr-1" />
            Start
          </Button>
        )}
        
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm">
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">Details</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{name}</DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </DialogHeader>
            <AgentDetails agent={agent} />
          </DialogContent>
        </Dialog>
      </CardFooter>
    </Card>
  );
}
