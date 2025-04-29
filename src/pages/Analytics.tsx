import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";

const data = [
  {
    name: "Mon",
    total: 0,
  },
  {
    name: "Tue",
    total: 0,
  },
  {
    name: "Wed",
    total: 0,
  },
  {
    name: "Thu",
    total: 0,
  },
  {
    name: "Fri",
    total: 0,
  },
  {
    name: "Sat",
    total: 0,
  },
  {
    name: "Sun",
    total: 0,
  },
];

export default function Analytics() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader 
          title="Analytics" 
          description="View reconciliation metrics and trends" 
        />

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Weekly Activity</CardTitle>
                  <CardDescription>Reconciliations processed this week</CardDescription>
                </CardHeader>
                <CardContent className="px-2">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data}>
                      <XAxis dataKey="name" tickLine={false} axisLine={false} />
                      <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                      <Bar dataKey="total" radius={[4, 4, 0, 0]} className="fill-primary" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              
              <div className="grid gap-4 grid-rows-2">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle>Success Rate</CardTitle>
                    <CardDescription>Reconciliation match rate</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">0%</div>
                    <p className="text-xs text-muted-foreground">No reconciliations yet</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle>Processing Time</CardTitle>
                    <CardDescription>Average processing time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">0s</div>
                    <p className="text-xs text-muted-foreground">No data available</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="performance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Agent Performance</CardTitle>
                <CardDescription>Performance metrics for each agent</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-center text-muted-foreground py-12">
                  No performance data available. Run reconciliations to generate metrics.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="trends" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Reconciliation Trends</CardTitle>
                <CardDescription>Historical trend analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-center text-muted-foreground py-12">
                  No trend data available. Complete more reconciliations to view trends.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
