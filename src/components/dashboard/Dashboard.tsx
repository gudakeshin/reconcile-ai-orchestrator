
import { StatusCard } from "../common/StatusCard";
import { AgentCard, AgentData } from "../agents/AgentCard";
import { TransactionTable } from "../transactions/TransactionTable";
import { ExceptionQueue } from "../exceptions/ExceptionQueue";
import { 
  BarChart3, 
  Database,
  Mail, 
  AlertCircle, 
  Workflow,
  MailCheck, 
  FileText,
  Search,
  Layout,
  Layers
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, PieChart, Pie, Cell, Legend, Tooltip } from "recharts";

const COLORS = ['#00C49F', '#FFBB28', '#FF8042'];

const transactionData = [
  { name: 'Matched', value: 84 },
  { name: 'Unmatched', value: 12 },
  { name: 'Exceptions', value: 4 },
];

const agentsData: Array<{ agent: AgentData, icon: React.ElementType }> = [
  {
    agent: {
      name: "Data Extraction & Cleansing",
      description: "Securely ingest, normalize and validate source data from multiple systems",
      status: "active",
      objective: "Securely ingest, normalize and validate source data from multiple systems",
      keyFunctions: [
        "Connect to ERP, banking-feeds, TMS via APIs/ODBC/flat files",
        "Parse & standardize fields (dates, currencies)",
        "Remove duplicates & correct formatting errors",
        "Audit logging"
      ],
      roleDefinition: "Acts as the \"data gatekeeper,\" ensuring downstream agents get consistent, high-quality input",
      goalSpecification: "100% of incoming files ingested within 1 hr SLA\n< 1% cleansing error rate",
      capabilities: [
        "ETL frameworks (Informatica, Talend)",
        "Python, SQL scripting",
        "Data profiling & validation",
        "Financial formats (MT940, BAI2)"
      ],
      interactions: [
        "Feeds cleansed data to Classifier Agent",
        "Alerts Supervisor Agent on data-feed failures"
      ],
      workflow: [
        "Poll source endpoints",
        "Ingest raw data",
        "Run validation rules",
        "Normalize & cleanse",
        "Publish to message queue"
      ],
      metrics: [
        "Throughput (records/hr)",
        "Cleansing error rate (%)",
        "SLA adherence (%)",
        "Avg processing time/file"
      ],
      progress: 85,
      taskCount: 215,
      lastActive: "2 mins ago"
    },
    icon: Database
  },
  {
    agent: {
      name: "Classifier",
      description: "Automatically categorize each transaction for targeted reconciliation rules",
      status: "active",
      objective: "Automatically categorize each transaction for targeted reconciliation rules",
      keyFunctions: [
        "Apply rule-based & ML classification models",
        "Tag transactions with metadata (unit, product, currency, risk)",
        "Dynamically update taxonomy"
      ],
      roleDefinition: "\"Traffic cop\" ensuring each record carries correct metadata for reconciliation logic",
      goalSpecification: "≥ 98% classification accuracy\nRetrain model within 24 hr of drift detection",
      capabilities: [
        "ML (scikit-learn, TensorFlow)",
        "Business-rule engines (Drools)",
        "Domain taxonomy knowledge"
      ],
      interactions: [
        "Consumes cleansed data from Extraction Agent",
        "Sends tagged records to Reconciliation Agent",
        "Notifies Supervisor on model drift"
      ],
      workflow: [
        "Receive cleansed batch",
        "Apply rules & ML model",
        "Validate tags",
        "Forward to Reconciliation Agent"
      ],
      metrics: [
        "Classification accuracy (%)",
        "False-pos/neg rates",
        "Model drift interval"
      ],
      progress: 92,
      taskCount: 178,
      lastActive: "1 min ago"
    },
    icon: Search
  },
  {
    agent: {
      name: "Reconciliation",
      description: "Match transactions between ledgers, statements & sub-systems; flag exceptions",
      status: "active",
      objective: "Match transactions between ledgers, statements & sub-systems for example (this would expand to other reco categories); flag exceptions",
      keyFunctions: [
        "Execute matching algorithms (exact, fuzzy, variance)",
        "Create exception records",
        "Suggest potential matches for review"
      ],
      roleDefinition: "Core \"matcher\" performing the financial reconciliation logic",
      goalSpecification: "≥ 99% of low-complexity items auto-matched\nExceptions < 5% of total volume",
      capabilities: [
        "Reconciliation engines (BlackLine, Trintech)",
        "Algorithm design (fuzzy logic)",
        "SQL & in-memory data structures"
      ],
      interactions: [
        "Reads tagged data from Classifier Agent",
        "Writes matches & exceptions to DB",
        "Notifies Routing Agent for exceptions"
      ],
      workflow: [
        "Load batch of tagged transactions",
        "Run matching logic",
        "Write matched pairs",
        "Emit exceptions list to Routing Agent"
      ],
      metrics: [
        "Auto-match rate (%)",
        "Exception rate (%)",
        "Avg matching time/record"
      ],
      progress: 78,
      taskCount: 156,
      lastActive: "Just now"
    },
    icon: Layers
  },
  {
    agent: {
      name: "Routing",
      description: "Deliver exceptions to the correct human teams, systems, or next-level agents",
      status: "active",
      objective: "Deliver exceptions to the correct human teams, systems, or next-level agents",
      keyFunctions: [
        "Analyze exception type & severity",
        "Apply routing rules (unit, geography, complexity)",
        "Create tickets in ServiceNow/JIRA"
      ],
      roleDefinition: "\"Dispatcher\" ensuring exceptions land in the right workflow queue",
      goalSpecification: "100% exceptions correctly routed\nMean time to route < 5 min",
      capabilities: [
        "Workflow orchestration (Camunda, Airflow)",
        "Ticketing API integration",
        "Business-rule configuration"
      ],
      interactions: [
        "Consumes exceptions from Reconciliation Agent",
        "Creates/resolves tasks for human agents",
        "Updates Supervisor on backlog status"
      ],
      workflow: [
        "Receive exception batch",
        "Evaluate routing logic",
        "Create/assign tickets",
        "Ack back to Reconciliation Agent"
      ],
      metrics: [
        "Routing accuracy (%)",
        "Time to route (min)",
        "Mis-routed count"
      ],
      progress: 65,
      taskCount: 42,
      lastActive: "5 mins ago"
    },
    icon: Layout
  },
  {
    agent: {
      name: "Supervisor",
      description: "Monitor health & performance of the entire reconciliation pipeline; trigger alerts/escalations",
      status: "active",
      objective: "Monitor health & performance of the entire reconciliation pipeline; trigger alerts/escalations",
      keyFunctions: [
        "Aggregate metrics from all agents",
        "Detect SLA breaches/performance degradation",
        "Send alerts (email/Teams/SMS)",
        "Generate daily/weekly reports"
      ],
      roleDefinition: "\"Control tower\" with end-to-end visibility and governance authority",
      goalSpecification: "100% SLA compliance\n< 1% unaddressed exceptions older than threshold",
      capabilities: [
        "Monitoring (Prometheus, Grafana)",
        "Alerting (PagerDuty)",
        "Reporting (Tableau, Power BI)",
        "Scripting for log/metrics queries"
      ],
      interactions: [
        "Pulls logs/metrics from all agents",
        "Sends alerts to support & management",
        "Can invoke Extraction Agent to re-run failed jobs"
      ],
      workflow: [
        "Poll metrics endpoints",
        "Evaluate vs. SLA thresholds",
        "Push alerts/dashboards",
        "Archive data",
        "Trigger escalations if needed"
      ],
      metrics: [
        "SLA adherence (%)",
        "Time to detect breach (min)",
        "Number of escalations",
        "Dashboard uptime (%)"
      ],
      progress: 98,
      taskCount: 320,
      lastActive: "Just now"
    },
    icon: Workflow
  },
  {
    agent: {
      name: "Email Agent",
      description: "Manages notifications and alerts to stakeholders",
      status: "inactive",
      objective: "Handle all communications with stakeholders",
      keyFunctions: [
        "Format and send email notifications",
        "Process replies and inquiries",
        "Escalate based on priority rules"
      ],
      roleDefinition: "Communication manager ensuring all stakeholders are informed",
      goalSpecification: "100% notification delivery within SLA\n< 2 hour response time to inquiries",
      capabilities: [
        "Email templating and formatting",
        "Natural language processing",
        "Priority-based routing"
      ],
      interactions: [
        "Receives alerts from Supervisor Agent",
        "Notifies team members of exceptions",
        "Provides status updates to management"
      ],
      workflow: [
        "Receive notification request",
        "Select appropriate template",
        "Personalize content",
        "Schedule and send",
        "Track responses"
      ],
      metrics: [
        "Delivery rate (%)",
        "Open rate (%)",
        "Response time (hours)",
        "Escalation accuracy (%)"
      ],
      taskCount: 18,
      lastActive: "1 hour ago"
    },
    icon: MailCheck
  }
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

      <h2 className="text-xl font-semibold mt-8 mb-4">AI Agent Network</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agentsData.map(({ agent, icon: Icon }) => (
          <AgentCard 
            key={agent.name}
            agent={agent}
            icon={<Icon />}
          />
        ))}
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
