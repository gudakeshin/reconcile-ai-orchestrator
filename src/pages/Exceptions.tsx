
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ExceptionQueue } from "@/components/exceptions/ExceptionQueue";
import { PageHeader } from "@/components/common/PageHeader";

export default function Exceptions() {
  return (
    <DashboardLayout>
      <div className="space-y-4">
        <PageHeader 
          title="Exceptions" 
          description="View and resolve reconciliation exceptions" 
        />
        <ExceptionQueue />
      </div>
    </DashboardLayout>
  );
}
