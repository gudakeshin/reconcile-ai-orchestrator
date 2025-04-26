
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { FileUpload } from "@/components/upload/FileUpload";

export default function Upload() {
  return (
    <DashboardLayout>
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Upload Files</h1>
        <p className="text-muted-foreground">Upload Excel files for reconciliation</p>
        <FileUpload />
      </div>
    </DashboardLayout>
  );
}
