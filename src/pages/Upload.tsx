
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { FileUpload } from "@/components/upload/FileUpload";
import { PageHeader } from "@/components/common/PageHeader";

export default function Upload() {
  return (
    <DashboardLayout>
      <div className="space-y-4">
        <PageHeader 
          title="Upload Files" 
          description="Upload Excel files for reconciliation" 
        />
        <FileUpload />
      </div>
    </DashboardLayout>
  );
}
