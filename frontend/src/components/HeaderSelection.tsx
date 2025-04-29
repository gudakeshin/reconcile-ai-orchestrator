import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface FileHeaderInfo {
  file_name: string;
  headers: string[];
  sample_data: Record<string, string[]>;
}

interface HeaderSelectionProps {
  files: Record<string, FileHeaderInfo>;
  onConfigure: (config: {
    source_file: string;
    target_file: string;
    matching_headers: Record<string, string>;
    tolerance_rules: Record<string, number>;
  }) => void;
}

export function HeaderSelection({ files, onConfigure }: HeaderSelectionProps) {
  const [sourceFile, setSourceFile] = useState<string>("");
  const [targetFile, setTargetFile] = useState<string>("");
  const [matchingHeaders, setMatchingHeaders] = useState<Record<string, string>>({});
  const [toleranceRules, setToleranceRules] = useState<Record<string, number>>({});

  const handleSourceFileChange = (value: string) => {
    setSourceFile(value);
    setMatchingHeaders({});
  };

  const handleTargetFileChange = (value: string) => {
    setTargetFile(value);
    setMatchingHeaders({});
  };

  const handleHeaderMatch = (sourceHeader: string, targetHeader: string) => {
    setMatchingHeaders(prev => ({
      ...prev,
      [sourceHeader]: targetHeader
    }));
  };

  const handleToleranceChange = (header: string, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      setToleranceRules(prev => ({
        ...prev,
        [header]: numValue
      }));
    }
  };

  const handleSubmit = () => {
    onConfigure({
      source_file: sourceFile,
      target_file: targetFile,
      matching_headers: matchingHeaders,
      tolerance_rules: toleranceRules
    });
  };

  const renderSampleData = (file: string) => {
    if (!file || !files[file]) return null;
    
    const headers = files[file].headers;
    const sampleData = files[file].sample_data;
    const rows = Math.min(...Object.values(sampleData).map(arr => arr.length));

    return (
      <div className="mt-4">
        <h4 className="text-sm font-medium mb-2">Sample Data Preview</h4>
        <div className="border rounded-md overflow-auto max-h-48">
          <Table>
            <TableHeader>
              <TableRow>
                {headers.map(header => (
                  <TableHead key={header}>{header}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: rows }).map((_, rowIndex) => (
                <TableRow key={rowIndex}>
                  {headers.map(header => (
                    <TableCell key={header}>{sampleData[header][rowIndex]}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Configure Reconciliation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Source File</Label>
            <Select value={sourceFile} onValueChange={handleSourceFileChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select source file" />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(files).map(fileName => (
                  <SelectItem key={fileName} value={fileName}>
                    {fileName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {renderSampleData(sourceFile)}
          </div>
          <div className="space-y-2">
            <Label>Target File</Label>
            <Select value={targetFile} onValueChange={handleTargetFileChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select target file" />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(files).map(fileName => (
                  <SelectItem key={fileName} value={fileName}>
                    {fileName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {renderSampleData(targetFile)}
          </div>
        </div>

        {sourceFile && targetFile && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Match Headers</h3>
            <div className="space-y-4">
              {files[sourceFile]?.headers.map(sourceHeader => (
                <div key={sourceHeader} className="grid grid-cols-2 gap-4 items-center">
                  <div className="font-medium">{sourceHeader}</div>
                  <div className="flex gap-2">
                    <Select
                      value={matchingHeaders[sourceHeader] || ""}
                      onValueChange={(value) => handleHeaderMatch(sourceHeader, value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select matching header" />
                      </SelectTrigger>
                      <SelectContent>
                        {files[targetFile]?.headers.map(targetHeader => (
                          <SelectItem key={targetHeader} value={targetHeader}>
                            {targetHeader}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      placeholder="Tolerance"
                      className="w-24"
                      onChange={(e) => handleToleranceChange(sourceHeader, e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <Button
          className="w-full"
          onClick={handleSubmit}
          disabled={!sourceFile || !targetFile || Object.keys(matchingHeaders).length === 0}
        >
          Start Reconciliation
        </Button>
      </CardContent>
    </Card>
  );
} 