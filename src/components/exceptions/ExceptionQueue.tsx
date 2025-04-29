
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle, Clock, ArrowRightCircle } from "lucide-react";

interface Exception {
  id: string;
  transactionId: string;
  type: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in-progress' | 'resolved';
  assignedTo?: string;
  createdAt: string;
}

const exceptions: Exception[] = [
  {
    id: "EX-001",
    transactionId: "TX-004",
    type: "Amount Mismatch",
    description: "Transaction amount does not match between source and destination systems",
    priority: 'high',
    status: 'pending',
    createdAt: "2025-04-24T10:30:00Z",
  },
  {
    id: "EX-002",
    transactionId: "TX-007",
    type: "Missing Reference",
    description: "Transaction is missing required reference code in destination system",
    priority: 'medium',
    status: 'in-progress',
    assignedTo: "Finance Team",
    createdAt: "2025-04-24T08:15:00Z",
  },
  {
    id: "EX-003",
    transactionId: "TX-012",
    type: "Duplicate Entry",
    description: "Transaction appears to be duplicated in reconciliation process",
    priority: 'low',
    status: 'resolved',
    assignedTo: "Operations",
    createdAt: "2025-04-23T14:45:00Z",
  },
];

export function ExceptionQueue() {
  const getPriorityBadge = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high':
        return (
          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
            High
          </Badge>
        );
      case 'medium':
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">
            Medium
          </Badge>
        );
      case 'low':
        return (
          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
            Low
          </Badge>
        );
    }
  };

  const getStatusIcon = (status: 'pending' | 'in-progress' | 'resolved') => {
    switch (status) {
      case 'pending':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'in-progress':
        return <Clock className="h-4 w-4 text-amber-500" />;
      case 'resolved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
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
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-destructive" />
          Exception Queue
        </CardTitle>
        <CardDescription>Transactions requiring human intervention</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {exceptions.map((exception) => (
              <TableRow key={exception.id}>
                <TableCell className="font-medium">{exception.id}</TableCell>
                <TableCell>{exception.type}</TableCell>
                <TableCell>{getPriorityBadge(exception.priority)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(exception.status)}
                    <span className="capitalize">{exception.status.replace('-', ' ')}</span>
                  </div>
                </TableCell>
                <TableCell>{formatDate(exception.createdAt)}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm">
                    <ArrowRightCircle className="h-4 w-4" />
                    <span className="sr-only">Review</span>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
