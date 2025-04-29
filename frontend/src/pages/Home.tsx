import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HeaderSelection } from '@/components/HeaderSelection';
import { useToast } from "@/components/ui/use-toast";
import { WorkflowLog } from '@/components/WorkflowLog';
import axios from 'axios';

interface FileHeaderInfo {
  file_name: string;
  headers: string[];
  sample_data: Record<string, string[]>;
}

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [fileHeaders, setFileHeaders] = useState<Record<string, FileHeaderInfo>>({});
  const [jobId, setJobId] = useState<string>("");
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one file",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    try {
      const response = await axios.post('http://localhost:8000/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setFileHeaders(response.data.headers);
      setJobId(response.data.job_id);
      toast({
        title: "Success",
        description: "Files uploaded successfully",
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Error",
        description: "Failed to upload files",
        variant: "destructive",
      });
    }
  };

  const handleConfigure = async (config: {
    source_file: string;
    target_file: string;
    matching_headers: Record<string, string>;
    tolerance_rules: Record<string, number>;
  }) => {
    try {
      // First configure the reconciliation
      const configResponse = await axios.post('http://localhost:8000/api/configure', {
        source_file: config.source_file,
        target_file: config.target_file,
        matching_headers: config.matching_headers,
        tolerance_rules: config.tolerance_rules,
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      toast({
        title: "Success",
        description: "Reconciliation configured successfully",
      });

      // Then start the reconciliation process with both files and configuration
      const formData = new FormData();
      
      // Add files
      files.forEach(file => {
        formData.append('files', file);
      });

      // Add configuration as form fields
      formData.append('source_file', config.source_file);
      formData.append('target_file', config.target_file);
      
      // Add matching headers as a single form field
      formData.append('matching_headers', JSON.stringify(config.matching_headers));
      
      // Add tolerance rules as a single form field
      formData.append('tolerance_rules', JSON.stringify(config.tolerance_rules));

      // Log the form data for debugging
      console.log('FormData contents:');
      for (const [key, value] of formData.entries()) {
        console.log(`${key}: ${value}`);
      }

      const reconcileResponse = await axios.post('http://localhost:8000/api/reconcile', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setJobId(reconcileResponse.data.job_id);
      toast({
        title: "Success",
        description: "Reconciliation process started",
      });
    } catch (error) {
      console.error('Configuration error:', error);
      if (axios.isAxiosError(error)) {
        toast({
          title: "Error",
          description: error.response?.data?.detail || "Failed to configure reconciliation",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to configure reconciliation",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>File Upload</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Input
              type="file"
              multiple
              onChange={handleFileChange}
              className="flex-1"
            />
            <Button onClick={handleUpload} disabled={files.length === 0}>
              Upload Files
            </Button>
          </div>
        </CardContent>
      </Card>

      {Object.keys(fileHeaders).length > 0 && (
        <HeaderSelection files={fileHeaders} onConfigure={handleConfigure} />
      )}

      {jobId && <WorkflowLog jobId={jobId} />}
    </div>
  );
} 