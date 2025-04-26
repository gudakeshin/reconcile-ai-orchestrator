
import { ExceptionQueue } from "@/components/exceptions/ExceptionQueue";
import { FileUpload } from "@/components/upload/FileUpload";
import { WorkflowLog } from "@/components/workflow/WorkflowLog";

export function Dashboard() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FileUpload />
        <WorkflowLog />
      </div>
      
      <div className="grid grid-cols-1 gap-6">
        <ExceptionQueue />
      </div>
    </div>
  );
}
