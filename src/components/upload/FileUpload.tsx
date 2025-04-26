
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Upload, File, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
}

export function FileUpload() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList) return;

    const newFiles: UploadedFile[] = [];
    
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" || 
          file.type === "application/vnd.ms-excel") {
        newFiles.push({
          id: Math.random().toString(36).substring(2, 9),
          name: file.name,
          size: file.size,
          type: file.type,
        });
      } else {
        toast({
          title: "Invalid file type",
          description: "Please upload only Excel files (.xlsx, .xls)",
          variant: "destructive",
        });
      }
    }

    setFiles([...files, ...newFiles]);
    e.target.value = ""; // Reset input
  };

  const removeFile = (id: string) => {
    setFiles(files.filter(file => file.id !== id));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " bytes";
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    else return (bytes / 1048576).toFixed(1) + " MB";
  };

  const startReconciliation = () => {
    if (files.length < 2) {
      toast({
        title: "Not enough files",
        description: "Please upload at least two Excel files to reconcile",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    // Simulate processing
    setTimeout(() => {
      toast({
        title: "Reconciliation started",
        description: "Files are being processed by the agents",
      });
      
      // Log workflow
      console.log("Data Extraction & Cleansing agent started processing files");
      logWorkflowStep("Data Extraction & Cleansing", "Processing started", files.map(f => f.name).join(", "));
      
      // Simulate next step after delay
      setTimeout(() => {
        console.log("Classifier agent categorizing transactions");
        logWorkflowStep("Classifier", "Categorizing transactions", "Applying ML models and business rules");
        
        setTimeout(() => {
          console.log("Reconciliation agent matching transactions");
          logWorkflowStep("Reconciliation", "Matching transactions", "Running exact and fuzzy matching algorithms");
          
          setTimeout(() => {
            console.log("Routing agent handling exceptions");
            logWorkflowStep("Routing", "Processing exceptions", "3 exceptions identified and routed");
            
            setTimeout(() => {
              console.log("Supervisor agent generating reports");
              logWorkflowStep("Supervisor", "Generating reports", "Reconciliation complete with 97% match rate");
              
              setIsProcessing(false);
              setFiles([]);
              
              toast({
                title: "Reconciliation complete",
                description: "View the results in the dashboard",
              });
            }, 2000);
          }, 2000);
        }, 2000);
      }, 2000);
    }, 2000);
  };

  const logWorkflowStep = (agent: string, action: string, details: string) => {
    // In a real implementation, this would likely dispatch to a store or API
    // For now, we're just simulating the workflow
    const workflowEvent = {
      timestamp: new Date().toISOString(),
      agent,
      action,
      details
    };
    
    console.log("Workflow event:", workflowEvent);
    
    // This would trigger UI updates in a real implementation
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Upload className="h-5 w-5 text-primary" />
          File Upload
        </CardTitle>
        <CardDescription>Upload Excel files for reconciliation</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="border-2 border-dashed rounded-lg p-6 text-center">
          <File className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
          <p className="text-sm mb-2">Drag and drop Excel files here or click to browse</p>
          <p className="text-xs text-muted-foreground mb-4">Supports .xlsx and .xls files</p>
          <Input 
            type="file" 
            className="hidden" 
            id="file-upload" 
            accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            multiple
            onChange={handleFileChange}
          />
          <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
            <label htmlFor="file-upload" className="cursor-pointer">Select Files</label>
          </Button>
        </div>

        {files.length > 0 && (
          <>
            <Separator className="my-4" />
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {files.map((file) => (
                <div key={file.id} className="flex items-center justify-between bg-muted/50 p-2 rounded-md">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <File className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-sm font-medium truncate">{file.name}</span>
                    <span className="text-xs text-muted-foreground">({formatFileSize(file.size)})</span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6" 
                    onClick={() => removeFile(file.id)}
                    disabled={isProcessing}
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Remove</span>
                  </Button>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
      <CardFooter>
        <Button 
          className="ml-auto" 
          onClick={startReconciliation} 
          disabled={files.length < 2 || isProcessing}
        >
          {isProcessing ? "Processing..." : "Start Reconciliation"}
        </Button>
      </CardFooter>
    </Card>
  );
}
