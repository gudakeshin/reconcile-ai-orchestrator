
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { 
  LayoutDashboard, 
  Users, 
  BarChart3, 
  Settings, 
  FileText, 
  Mail, 
  AlertCircle, 
  Workflow, 
  Database, 
  Upload,
  Search,
  Filter,
  CheckCircle
} from "lucide-react";
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";

interface NavigationItem {
  icon: React.ElementType;
  label: string;
  path: string;
  active?: boolean;
}

const primaryNavigation: NavigationItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/", active: true },
  { icon: Upload, label: "Upload Files", path: "/upload" },
  { icon: Database, label: "Transactions", path: "/transactions" },
  { icon: AlertCircle, label: "Exceptions", path: "/exceptions" },
];

const analysisNavigation: NavigationItem[] = [
  { icon: CheckCircle, label: "Reconciliation", path: "/reconciliation" },
  { icon: BarChart3, label: "Analytics", path: "/analytics" },
  { icon: FileText, label: "Reports", path: "/reports" },
];

const configNavigation: NavigationItem[] = [
  { icon: Settings, label: "Settings", path: "/settings" },
  { icon: Users, label: "User Management", path: "/users" },
];

export function Sidebar() {
  const navigate = useNavigate();
  
  return (
    <div className="h-screen w-64 bg-sidebar flex flex-col border-r">
      <div className="px-3 py-4">
        <div className="flex items-center h-12">
          <Workflow className="h-6 w-6 text-primary" />
          <h1 className="ml-2 text-xl font-bold text-sidebar-foreground">Reconcile AI</h1>
        </div>
      </div>
      
      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search..." 
            className="w-full bg-sidebar-accent/50 border-none rounded-md h-9 pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>
      
      <Separator className="bg-sidebar-border" />
      
      <ScrollArea className="flex-1 pt-4">
        <div className="px-3 pb-8">
          <div className="mb-4">
            <p className="text-xs font-medium text-sidebar-foreground/60 mb-2 px-2">
              Main
            </p>
            <SidebarMenu>
              {primaryNavigation.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton 
                    isActive={item.active} 
                    onClick={() => navigate(item.path)}
                  >
                    <item.icon className="mr-2 h-4 w-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </div>
          
          <div className="mb-4">
            <p className="text-xs font-medium text-sidebar-foreground/60 mb-2 px-2">
              Analysis
            </p>
            <SidebarMenu>
              {analysisNavigation.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton 
                    isActive={item.active} 
                    onClick={() => navigate(item.path)}
                  >
                    <item.icon className="mr-2 h-4 w-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </div>
          
          <Separator className="bg-sidebar-border my-4" />
          
          <div className="mb-4">
            <p className="text-xs font-medium text-sidebar-foreground/60 mb-2 px-2">
              Configuration
            </p>
            <SidebarMenu>
              {configNavigation.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton 
                    isActive={item.active} 
                    onClick={() => navigate(item.path)}
                  >
                    <item.icon className="mr-2 h-4 w-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </div>
        </div>
      </ScrollArea>
      
      <div className="p-3 border-t border-sidebar-border">
        <div className="mb-3">
          <ThemeToggle />
        </div>
        
        <div className="flex items-center gap-3 p-2 rounded-md bg-sidebar-accent/50">
          <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-medium">
            AI
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              Supervisor Agent
            </p>
            <p className="text-xs text-sidebar-foreground/60 truncate">
              Active - Orchestrating
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
