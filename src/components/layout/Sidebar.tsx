
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  LayoutDashboard, 
  Users, 
  BarChart3, 
  Settings, 
  FileText, 
  Mail, 
  AlertCircle, 
  Workflow, 
  Database 
} from "lucide-react";

const SidebarItem = ({
  icon: Icon,
  label,
  active = false,
  onClick
}: {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) => (
  <Button
    variant="ghost"
    className={`w-full justify-start ${
      active ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'hover:bg-sidebar-accent/50'
    }`}
    onClick={onClick}
  >
    <Icon className="mr-2 h-4 w-4" />
    {label}
  </Button>
);

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
      
      <Separator className="bg-sidebar-border" />
      
      <ScrollArea className="flex-1 pt-4">
        <div className="px-3 pb-8 space-y-1">
          <SidebarItem 
            icon={LayoutDashboard} 
            label="Dashboard" 
            active={true} 
            onClick={() => navigate('/')}
          />
          <SidebarItem 
            icon={Database} 
            label="Transactions" 
            onClick={() => navigate('/')}
          />
          <SidebarItem 
            icon={AlertCircle} 
            label="Exceptions" 
            onClick={() => navigate('/')}
          />
          <SidebarItem 
            icon={Mail} 
            label="Notifications" 
            onClick={() => navigate('/')}
          />
          <SidebarItem 
            icon={FileText} 
            label="Reports" 
            onClick={() => navigate('/')}
          />
          <SidebarItem 
            icon={BarChart3} 
            label="Analytics" 
            onClick={() => navigate('/')}
          />
        </div>
        
        <Separator className="bg-sidebar-border my-4" />
        
        <div className="px-3 pb-8 space-y-1">
          <p className="text-xs font-medium text-sidebar-foreground/60 mb-2 px-4">
            System
          </p>
          <SidebarItem 
            icon={Users} 
            label="Team" 
            onClick={() => navigate('/')}
          />
          <SidebarItem 
            icon={Settings} 
            label="Settings" 
            onClick={() => navigate('/')}
          />
        </div>
      </ScrollArea>
      
      <div className="p-3 border-t border-sidebar-border mt-auto">
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
