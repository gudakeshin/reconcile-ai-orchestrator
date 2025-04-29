import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Upload, File, X, ArrowRight, Check, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { reconciliationService } from "@/services/reconciliation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface HeaderMatch {
  header: string;
  pattern: string;
  confidence: number;
  recommended: boolean;
}

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  headers: string[];
  headerMatches: Record<string, HeaderMatch[]>;
  selectedHeaders: string[];
  validationErrors: string[];
  status: 'uploading' | 'success' | 'warning' | 'error';
  progress: number;
}

export function FileUpload() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [matchingHeaders, setMatchingHeaders] = useState<Record<string, string>>({});
  const [showHeaderSelection, setShowHeaderSelection] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const { toast } = useToast();
  const [sourceFile, setSourceFile] = useState<UploadedFile | null>(null);
  const [targetFile, setTargetFile] = useState<UploadedFile | null>(null);
  const [headerMappings, setHeaderMappings] = useState<Record<string, string>>({});
  const [deselectedHeaders, setDeselectedHeaders] = useState<Record<string, string[]>>({});

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  }, []);

  const handleFiles = async (files: FileList | File[]) => {
    try {
      // Convert FileList to array if needed
      const fileArray = Array.isArray(files) ? files : Array.from(files);
      
      if (!fileArray || fileArray.length === 0) {
        toast({
          title: "Error",
          description: "No files selected",
          variant: "destructive",
        });
        return;
      }

      // Update UI to show uploading state
      setFiles(prev => [
        ...prev,
        ...fileArray.map(file => ({
          id: Math.random().toString(36).substr(2, 9),
          name: file.name,
          size: file.size,
          headers: [],
          headerMatches: {},
          selectedHeaders: [],
          validationErrors: [],
          status: 'uploading',
          progress: 0
        }))
      ]);

      try {
        const response = await reconciliationService.uploadFiles(fileArray);
        
        setFiles(prev => prev.map(file => {
          const uploadedFile = fileArray.find(f => f.name === file.name);
          if (uploadedFile) {
            const headers = response.headers[file.name]?.headers || [];
            const sampleData = response.headers[file.name]?.sampleData || {};

            // Show available headers to help user
            const validationErrors = [`Available fields: ${headers.join(', ')}`];

            return {
              ...file,
              status: 'success',
              progress: 100,
              headers,
              sampleData,
              validationErrors
            };
          }
          return file;
        }));

        // Show success message
        toast({
          title: "Files Uploaded Successfully",
          description: "Please select the fields you want to use for reconciliation",
          variant: "default",
        });
      } catch (error) {
        console.error('Error uploading files:', error);
        // Update UI to show error state
        setFiles(prev => prev.map(file => {
          if (fileArray.some(f => f.name === file.name)) {
            return {
              ...file,
              status: 'error',
              validationErrors: [error instanceof Error ? error.message : 'Failed to upload file']
            };
          }
          return file;
        }));
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : 'Failed to upload files',
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error processing files:', error);
      toast({
        title: "Error",
        description: 'Failed to process files',
        variant: "destructive",
      });
    }
  };

  const handleFileSelect = (file: UploadedFile, type: 'source' | 'target') => {
    if (type === 'source') {
      setSourceFile(file);
    } else {
      setTargetFile(file);
    }
    setShowHeaderSelection(true);
    
    // Initialize deselected headers for this file
    setDeselectedHeaders(prev => ({
      ...prev,
      [file.id]: []
    }));
  };

  const handleHeaderDeselect = (fileId: string, header: string) => {
    setDeselectedHeaders(prev => ({
      ...prev,
      [fileId]: [...(prev[fileId] || []), header]
    }));
  };

  const handleHeaderReselect = (fileId: string, header: string) => {
    setDeselectedHeaders(prev => ({
      ...prev,
      [fileId]: (prev[fileId] || []).filter(h => h !== header)
    }));
  };

  const handleHeaderMatch = (header: string, targetHeader: string) => {
    setMatchingHeaders(prev => ({
      ...prev,
      [header]: targetHeader
    }));
  };

  const startReconciliation = async () => {
    if (!sourceFile || !targetFile) {
      toast({
        title: "Error",
        description: "Please select two files",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      // Get all available headers from both files
      const sourceHeaders = sourceFile.headers.filter(
        header => !deselectedHeaders[sourceFile.id]?.includes(header)
      );
      const targetHeaders = targetFile.headers.filter(
        header => !deselectedHeaders[targetFile.id]?.includes(header)
      );

      // Create header mappings based on available headers
      const mappings: Record<string, string> = {};
      
      // First, try to match headers based on exact names
      for (const sourceHeader of sourceHeaders) {
        const exactMatch = targetHeaders.find(
          targetHeader => targetHeader.toLowerCase() === sourceHeader.toLowerCase()
        );
        if (exactMatch) {
          mappings[sourceHeader] = exactMatch;
        }
      }

      // Then, try to match remaining headers based on similarity
      for (const sourceHeader of sourceHeaders) {
        if (!mappings[sourceHeader]) {
          const similarHeaders = targetHeaders.filter(
            targetHeader => !Object.values(mappings).includes(targetHeader)
          );
          
          if (similarHeaders.length > 0) {
            // Use the first available similar header
            mappings[sourceHeader] = similarHeaders[0];
          }
        }
      }

      setHeaderMappings(mappings);
      
      // Start reconciliation with selected headers
      const response = await reconciliationService.startReconciliation(
        sourceFile.id,
        targetFile.id,
        mappings
      );

      if (!response?.id) {
        throw new Error("No job ID received from server");
      }

      // Poll for job status
      const pollInterval = setInterval(async () => {
        try {
          const status = await reconciliationService.getJobStatus(response.id);
          
          if (status.status === 'completed') {
            clearInterval(pollInterval);
            setIsProcessing(false);
            setFiles([]);
            setSelectedFiles([]);
            setMatchingHeaders({});
            setShowHeaderSelection(false);
            
            toast({
              title: "Reconciliation complete",
              description: "View the results in the dashboard",
            });
          } else if (status.status === 'failed') {
            clearInterval(pollInterval);
            setIsProcessing(false);
            
            toast({
              title: "Reconciliation failed",
              description: status.error || "An error occurred during reconciliation",
              variant: "destructive",
            });
          }
        } catch (error) {
          console.error("Error polling job status:", error);
          clearInterval(pollInterval);
          setIsProcessing(false);
          
          toast({
            title: "Error",
            description: "Failed to check reconciliation status",
            variant: "destructive",
          });
        }
      }, 2000);

    } catch (error) {
      setIsProcessing(false);
      console.error("Error starting reconciliation:", error);
      toast({
        title: "Error",
        description: "Failed to start reconciliation process",
        variant: "destructive",
      });
    }
  };

  const removeFile = (id: string) => {
    const fileToRemove = files.find(f => f.id === id);
    if (fileToRemove) {
      setSelectedFiles(selectedFiles.filter(f => f !== fileToRemove.name));
    }
    setFiles(files.filter(file => file.id !== id));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " bytes";
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    else return (bytes / 1048576).toFixed(1) + " MB";
  };

  const renderHeaderSelection = () => {
    if (!sourceFile || !targetFile) return null;

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Header Selection</h3>
        
        {/* Source File Headers */}
        <div className="space-y-2">
          <h4 className="font-medium">Source File: {sourceFile.name}</h4>
          <div className="grid grid-cols-2 gap-2">
            {sourceFile.headers.map(header => {
              const isDeselected = deselectedHeaders[sourceFile.id]?.includes(header);
              const matchedHeader = matchingHeaders[header];
              
              return (
                <div key={header} className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={!isDeselected}
                      onChange={() => isDeselected ? handleHeaderReselect(sourceFile.id, header) : handleHeaderDeselect(sourceFile.id, header)}
                    />
                    <span className={isDeselected ? 'text-gray-400' : ''}>{header}</span>
                  </div>
                  {!isDeselected && (
                    <div className="pl-6">
                      <Select
                        value={matchedHeader || ''}
                        onValueChange={(value) => handleHeaderMatch(header, value)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select matching header" />
                        </SelectTrigger>
                        <SelectContent>
                          {targetFile.headers.map(targetHeader => (
                            <SelectItem key={targetHeader} value={targetHeader}>
                              {targetHeader}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <Button
          onClick={startReconciliation}
          disabled={isProcessing || !sourceFile || !targetFile}
        >
          {isProcessing ? "Processing..." : "Start Reconciliation"}
        </Button>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            File Upload
          </CardTitle>
          <CardDescription>
            Upload Excel files for reconciliation. The system will automatically identify key fields like ID and Currency.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
              dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25"
            )}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <File className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
            <p className="text-sm mb-2">Drag and drop Excel files here or click to browse</p>
            <p className="text-xs text-muted-foreground mb-4">
              The system will analyze your files and identify key fields automatically
            </p>
            <Input
              type="file"
              accept=".xlsx,.xls"
              multiple
              onChange={(e) => handleFiles(e.target.files)}
              className="hidden"
              id="file-upload"
            />
            <Button
              variant="outline"
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              Select Files
            </Button>
          </div>

          {files.length > 0 && (
            <div className="mt-6 space-y-4">
              <h3 className="text-sm font-medium">Uploaded Files</h3>
              <div className="space-y-2">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-lg border",
                      selectedFiles.includes(file.name) ? "border-primary" : "border-muted"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <File className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(file.size)}
                        </p>
                        {file.validationErrors?.length > 0 && (
                          <div className="mt-1">
                            {file.validationErrors.map((error, index) => (
                              <p key={index} className={cn(
                                "text-xs",
                                error.startsWith('No suitable') ? "text-destructive" : "text-muted-foreground"
                              )}>
                                {error}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {file.status === 'uploading' && (
                        <Progress value={file.progress} className="w-24" />
                      )}
                      {file.status === 'success' && (
                        <Badge variant="success" className="flex items-center gap-1">
                          <Check className="h-3 w-3" />
                          Ready
                        </Badge>
                      )}
                      {file.status === 'warning' && (
                        <Badge variant="warning" className="flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Review Required
                        </Badge>
                      )}
                      {file.status === 'error' && (
                        <Badge variant="destructive" className="flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Error
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleFileSelect(file, 'source')}
                        disabled={file.status === 'error'}
                      >
                        <ArrowRight className={cn(
                          "h-4 w-4",
                          selectedFiles.includes(file.name) ? "text-primary" : "text-muted-foreground"
                        )} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFile(file.id)}
                      >
                        <X className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {showHeaderSelection && selectedFiles.length === 2 && (
        <Card>
          {renderHeaderSelection()}
        </Card>
      )}
    </div>
  );
}
