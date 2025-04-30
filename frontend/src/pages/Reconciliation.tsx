import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { WorkflowProgressMonitor } from "@/components/workflow/WorkflowProgressMonitor";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WorkflowLog } from "@/components/workflow/WorkflowLog";
import { Button } from "@/components/ui/button";

export default function Reconciliation() {
  const [activeTab, setActiveTab] = useState("summary");

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader 
          title="Reconciliation" 
          description="Monitor and control reconciliation workflows" 
        />
        
        <Card>
          <CardHeader>
            <CardTitle>Workflow Control</CardTitle>
            <CardDescription>
              Track the progress of your reconciliation workflow and control execution
            </CardDescription>
          </CardHeader>
          <CardContent>
            <WorkflowProgressMonitor />
          </CardContent>
        </Card>

        <Tabs defaultValue="summary" className="space-y-4" onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="workflow">Workflow</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Files</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">0</div>
                  <p className="text-xs text-muted-foreground">0 files processed today</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Match Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">0%</div>
                  <p className="text-xs text-muted-foreground">No reconciliations yet</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Exceptions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">0</div>
                  <p className="text-xs text-muted-foreground">No exceptions found</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-center text-muted-foreground py-12">
                  No recent activity. Upload files to begin reconciliation.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="workflow" className="space-y-4">
            <WorkflowLog />
            <Button variant="outline">View All Workflows</Button>
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Reconciliation Reports</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-center text-muted-foreground py-12">
                  No reports available. Complete reconciliations to generate reports.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
