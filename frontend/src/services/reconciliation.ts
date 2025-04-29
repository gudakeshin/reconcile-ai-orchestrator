import api from '@/lib/api';

export interface ReconciliationJob {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  current_step: string;
  results?: any;
  error?: string;
}

export interface FileHeaderInfo {
  headers: string[];
  sampleData: Record<string, string[]>;
}

export interface UploadResponse {
  files: Array<{
    original_filename: string;
    temp_path: string;
    content_type: string;
    size: number;
  }>;
  headers: Record<string, FileHeaderInfo>;
}

export const reconciliationService = {
  async uploadFiles(files: File[]): Promise<UploadResponse> {
    try {
      if (!files || !Array.isArray(files) || files.length === 0) {
        throw new Error('No files provided for upload');
      }

      // Validate file types first
      const allowedTypes = [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv',
        'text/tab-separated-values',
        'text/plain',
        ''  // Sometimes browsers don't set MIME type correctly
      ];

      // Check each file
      for (const file of files) {
        if (!file || !(file instanceof File)) {
          throw new Error('Invalid file object provided');
        }
        
        // Check filename extension as fallback
        const fileExt = file.name.split('.').pop()?.toLowerCase();
        const validExts = ['xlsx', 'xls', 'csv', 'tsv', 'txt'];
        
        // Skip MIME check if extension is valid
        if (validExts.includes(fileExt)) {
          continue;
        }
        
        // Otherwise check MIME type
        if (!allowedTypes.includes(file.type)) {
          throw new Error(`File type ${file.type || 'unknown'} not supported. Please upload Excel, CSV, or TSV files.`);
        }
      }

      const formData = new FormData();
      files.forEach((file) => {
        formData.append('files', file, file.name);
      });

      try {
        const response = await api.post('/api/upload', formData);
        
        if (!response.data || !response.data.files || !response.data.headers) {
          throw new Error('Invalid response format from server');
        }

        return response.data;
      } catch (error) {
        console.error('Error uploading files:', error);
        if (error.response) {
          console.error('Error response:', error.response.data);
          
          // Provide better error message for common issues
          if (error.response.status === 500) {
            const errorMsg = error.response.data.detail || '';
            
            if (errorMsg.includes("Failed to extract headers")) {
              throw new Error(`File format error: The system couldn't read the file headers. Please ensure you're uploading a valid Excel, CSV or TSV file.`);
            }
            
            if (errorMsg.includes("binary/Excel file but could not be processed")) {
              throw new Error(`Excel file format error: The system couldn't process your Excel file. Please try saving it as CSV or in newer Excel format.`);
            }
          }
          
          throw new Error(`Upload failed: ${error.response.data.detail || error.message}`);
        } else if (error.request) {
          console.error('No response received:', error.request);
          throw new Error('Server not responding. Please try again later.');
        } else {
          console.error('Error setting up request:', error.message);
          throw error;
        }
      }
    } catch (error) {
      console.error('Error in uploadFiles:', error);
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error('Unknown error occurred during file upload');
      }
    }
  },

  async startReconciliation(
    files: File[],
    sourceFile: string,
    targetFile: string,
    matchingHeaders: Record<string, string>,
    toleranceRules: Record<string, number> = {}
  ): Promise<ReconciliationJob> {
    const formData = new FormData();
    
    // Add files
    files.forEach((file) => {
      formData.append('files', file);
    });

    // Add configuration
    formData.append('source_file', sourceFile);
    formData.append('target_file', targetFile);
    formData.append('matching_headers', JSON.stringify(matchingHeaders));
    formData.append('tolerance_rules', JSON.stringify(toleranceRules));

    const response = await api.post('/api/reconcile', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    // Transform the response to match the ReconciliationJob interface
    return {
      id: response.data.job_id,
      status: 'pending',
      current_step: 'Starting',
      results: null
    };
  },

  async getJobStatus(jobId: string): Promise<ReconciliationJob> {
    const response = await api.get(`/api/reconcile/status/${jobId}`);
    return response.data;
  },

  async getSystemMetrics() {
    const response = await api.get('/api/metrics');
    return response.data;
  },
}; 