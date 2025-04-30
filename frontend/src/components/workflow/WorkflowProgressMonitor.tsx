import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  status: "inactive" | "active" | "completed" | "error";
}

interface WorkflowState {
  status: "queued" | "running" | "completed" | "failed";
  currentStep: string | null;
}

export function WorkflowProgressMonitor() {
  const [steps, setSteps] = useState<WorkflowStep[]>([
    {
      id: "extraction",
      title: "Data Extraction & Cleansing",
      description: "Extracting and cleaning data from input files",
      status: "inactive"
    },
    {
      id: "classification",
      title: "Classification",
      description: "Classifying transactions based on patterns",
      status: "inactive"
    },
    {
      id: "matching",
      title: "Matching",
      description: "Finding matching transactions across datasets",
      status: "inactive"
    },
    {
      id: "reconciliation",
      title: "Reconciliation",
      description: "Performing final reconciliation and analysis",
      status: "inactive"
    }
  ]);

  const [workflowState, setWorkflowState] = useState<WorkflowState>({
    status: "queued",
    currentStep: null
  });

  const startWorkflow = () => {
    // In a real implementation, this would trigger the actual workflow
    // and likely connect to a backend service via API
    setWorkflowState({
      status: "running",
      currentStep: "extraction"
    });
    
    // Update the first step to active
    const updatedSteps = [...steps];
    updatedSteps[0].status = "active";
    setSteps(updatedSteps);

    // For demo purposes, you might want to simulate progression through steps
    // This would typically be driven by real-time updates from the backend
  };

  const simulateFailure = () => {
    // Simulate a workflow failure
    const currentStepIndex = steps.findIndex(step => step.status === "active");
    if (currentStepIndex >= 0) {
      const updatedSteps = [...steps];
      updatedSteps[currentStepIndex].status = "error";
      setSteps(updatedSteps);
      
      setWorkflowState({
        status: "failed",
        currentStep: steps[currentStepIndex].id
      });
    } else {
      setWorkflowState({
        status: "failed",
        currentStep: null
      });
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Workflow Progress</h2>
      
      {/* Step Indicators */}
      <div className="relative">
        <div className="flex justify-between mb-8">
          {steps.map((step, index) => (
            <div 
              key={step.id}
              className={`
                w-1/4 px-4 py-3 mx-2 rounded-md border 
                ${step.status === "active" 
                  ? "bg-primary/10 border-primary" 
                  : step.status === "completed" 
                    ? "bg-green-50 border-green-300" 
                    : step.status === "error" 
                      ? "bg-red-50 border-red-300" 
                      : "bg-gray-50 border-gray-200"
                }
              `}
            >
              <h3 className="text-sm font-medium">{step.title}</h3>
              <p className="text-xs text-muted-foreground mt-1">{step.description}</p>
            </div>
          ))}
        </div>
        
        {/* Connecting line */}
        <div className="absolute top-6 left-0 right-0 h-0.5 bg-gray-200 -z-10"></div>
      </div>
      
      {/* Action Buttons */}
      <div className="flex space-x-4">
        <Button 
          onClick={startWorkflow}
          disabled={workflowState.status === "running"}
        >
          Start Workflow
        </Button>
        <Button 
          variant="destructive" 
          onClick={simulateFailure}
          disabled={workflowState.status !== "running"}
        >
          Simulate Failure
        </Button>
      </div>
      
      {/* Current State Display */}
      <div className="mt-6">
        <h3 className="text-lg font-medium mb-2">Current State:</h3>
        <pre className="bg-slate-100 p-4 rounded-md border border-slate-200 text-sm overflow-auto">
          {JSON.stringify(workflowState, null, 2)}
        </pre>
      </div>
    </div>
  );
} 