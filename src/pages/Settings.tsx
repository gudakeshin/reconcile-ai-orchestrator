
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const { toast } = useToast();
  const [emailSettings, setEmailSettings] = useState({
    notificationsEnabled: true,
    recipientEmail: "chaturvedi.pallav@gmail.com",
    dailyDigest: false,
    weeklyReport: true,
  });

  const handleSaveSettings = () => {
    toast({
      title: "Settings Saved",
      description: "Your settings have been updated successfully."
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage application settings</p>
        </div>

        <Tabs defaultValue="general" className="space-y-4">
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="api">API Keys</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>
          
          <TabsContent value="general" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>Configure basic application settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="company-name">Company Name</Label>
                  <Input id="company-name" placeholder="Enter company name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <select className="w-full p-2 border rounded" id="timezone">
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">Eastern Time (ET)</option>
                    <option value="America/Chicago">Central Time (CT)</option>
                    <option value="America/Denver">Mountain Time (MT)</option>
                    <option value="America/Los_Angeles">Pacific Time (PT)</option>
                    <option value="Asia/Kolkata">India Standard Time (IST)</option>
                  </select>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="auto-backup" checked />
                  <Label htmlFor="auto-backup">Enable automatic backups</Label>
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handleSaveSettings}>Save Changes</Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="notifications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Email Notifications</CardTitle>
                <CardDescription>Configure email notification settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="email-notifications" 
                    checked={emailSettings.notificationsEnabled}
                    onCheckedChange={(checked) => setEmailSettings({...emailSettings, notificationsEnabled: checked})}
                  />
                  <Label htmlFor="email-notifications">Enable email notifications</Label>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input 
                    id="email" 
                    value={emailSettings.recipientEmail}
                    onChange={(e) => setEmailSettings({...emailSettings, recipientEmail: e.target.value})}
                  />
                </div>
                <div className="space-y-4 pt-4">
                  <h3 className="text-sm font-medium">Notification Types</h3>
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="daily-digest" 
                      checked={emailSettings.dailyDigest}
                      onCheckedChange={(checked) => setEmailSettings({...emailSettings, dailyDigest: checked})}
                    />
                    <Label htmlFor="daily-digest">Daily digest</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="weekly-report" 
                      checked={emailSettings.weeklyReport}
                      onCheckedChange={(checked) => setEmailSettings({...emailSettings, weeklyReport: checked})}
                    />
                    <Label htmlFor="weekly-report">Weekly report</Label>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handleSaveSettings}>Save Changes</Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="api" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>API Keys</CardTitle>
                <CardDescription>Configure integration API keys</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="openai-api-key">OpenAI API Key</Label>
                  <Input id="openai-api-key" type="password" placeholder="Enter API key" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="webhook-url">Webhook URL</Label>
                  <Input id="webhook-url" placeholder="Enter webhook URL" />
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handleSaveSettings}>Save API Keys</Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="advanced" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Advanced Settings</CardTitle>
                <CardDescription>Configure advanced options</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reconciliation-threshold">Reconciliation Match Threshold (%)</Label>
                  <Input id="reconciliation-threshold" type="number" defaultValue="95" min="0" max="100" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="custom-rules">Custom Reconciliation Rules</Label>
                  <Textarea id="custom-rules" placeholder="Enter custom rules in JSON format" rows={6} />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="debug-mode" />
                  <Label htmlFor="debug-mode">Enable debug mode</Label>
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handleSaveSettings}>Save Settings</Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
