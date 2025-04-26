
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AgentData } from "./AgentCard";

interface AgentDetailsProps {
  agent: AgentData;
}

export function AgentDetails({ agent }: AgentDetailsProps) {
  const {
    name,
    objective,
    keyFunctions,
    roleDefinition,
    goalSpecification,
    capabilities,
    interactions,
    workflow,
    metrics
  } = agent;

  const renderList = (items: string[] | undefined) => {
    if (!items || items.length === 0) return <p className="text-muted-foreground">No data available</p>;
    return (
      <ul className="list-disc pl-6 space-y-1">
        {items.map((item, index) => (
          <li key={index} className="text-sm">{item}</li>
        ))}
      </ul>
    );
  };

  const renderSection = (title: string, content: string | string[] | undefined) => {
    if (!content) return null;
    
    return (
      <div className="mb-4">
        <h4 className="text-sm font-medium mb-1">{title}</h4>
        {typeof content === 'string' ? (
          <p className="text-sm text-muted-foreground">{content}</p>
        ) : (
          renderList(content)
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4 py-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Objective</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{objective || "No objective specified"}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Role Definition</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{roleDefinition || "No role definition specified"}</p>
          </CardContent>
        </Card>
      </div>
      
      <Separator />
      
      {renderSection("Key Functions", keyFunctions)}
      {renderSection("Goal Specification", goalSpecification)}
      {renderSection("Capabilities & Skills", capabilities)}
      
      <Separator />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          {renderSection("Interaction with Other Agents", interactions)}
        </div>
        <div>
          {renderSection("Performance Metrics", metrics)}
        </div>
      </div>
      
      {workflow && workflow.length > 0 && (
        <>
          <Separator />
          <div>
            <h4 className="text-sm font-medium mb-2">Task Execution Workflow</h4>
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-muted-foreground/20" />
              <ol className="space-y-4">
                {workflow.map((step, index) => (
                  <li key={index} className="flex items-start">
                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center z-10 mr-3">
                      <span className="text-xs font-bold">{index + 1}</span>
                    </div>
                    <div className="pt-1.5">
                      <p className="text-sm">{step}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
