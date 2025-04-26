
import { StatusCard } from "../common/StatusCard";
import { AgentCard } from "../agents/AgentCard";
import { TransactionTable } from "../transactions/TransactionTable";
import { ExceptionQueue } from "../exceptions/ExceptionQueue";
import { 
  BarChart3, 
  Database, 
  Mail, 
  AlertCircle, 
  Brain, 
  Bot, 
  MailCheck, 
  FileText, 
  Workflow 
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, PieChart, Pie, Cell, Legend, Tooltip } from "recharts";

const COLORS = ['#00C49F', '#FFBB28', '#FF8042'];

const transactionData = [
  { name: 'Matched', value: 84 },
  { name: 'Unmatched', value: 12 },
  { name: 'Exceptions', value: 4 },
];

export function Dashboard() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI Reconciliation Dashboard</h1>
          <p className="text-muted-foreground">Orchestrating financial reconciliation processes with AI</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatusCard
          title="Total Transactions"
          value="42,856"
          icon={<Database />}
          description="Last 30 days"
          trend={{ value: 12.5, isPositive: true }}
        />
        <StatusCard
          title="Match Rate"
          value="96.4%"
          icon={<BarChart3 />}
          description="Current period"
          trend={{ value: 3.2, isPositive: true }}
        />
        <StatusCard
          title="Active Exceptions"
          value="42"
          icon={<AlertCircle />}
          description="Requiring attention"
          trend={{ value: 8.7, isPositive: false }}
        />
        <StatusCard
          title="Notifications"
          value="18"
          icon={<Mail />}
          description="Sent in last 24 hours"
          trend={{ value: 5.3, isPositive: true }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <AgentCard
          name="Workflow Agent"
          description="Manages transaction processing workflows and routing"
          status="active"
          progress={78}
          taskCount={156}
          lastActive="2 mins ago"
          icon={<Workflow />}
        />
        <AgentCard
          name="LLM Matching Agent"
          description="Uses fine-tuned language models for complex transaction matching"
          status="active"
          progress={65}
          taskCount={320}
          lastActive="Just now"
          icon={<Brain />}
        />
        <AgentCard
          name="Email Agent"
          description="Manages notifications and alerts to stakeholders"
          status="inactive"
          taskCount={18}
          lastActive="1 hour ago"
          icon={<MailCheck />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <TransactionTable />
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Transaction Status</CardTitle>
            <CardDescription>Current reconciliation performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={transactionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {transactionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <ExceptionQueue />
    </div>
  );
}
