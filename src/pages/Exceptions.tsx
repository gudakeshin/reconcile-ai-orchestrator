
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ExceptionQueue } from "@/components/exceptions/ExceptionQueue";

export default function Exceptions() {
  return (
    <DashboardLayout>
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Exceptions</h1>
        <p className="text-muted-foreground">View and resolve reconciliation exceptions</p>
        <ExceptionQueue />
      </div>
    </DashboardLayout>
  );
}
