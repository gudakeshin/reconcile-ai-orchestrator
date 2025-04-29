
import React from 'react';
import { FileText } from 'lucide-react';

interface EmptyStateProps {
  message: string;
  icon?: React.ElementType;
}

export function EmptyState({ message, icon: Icon = FileText }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Icon className="h-16 w-16 text-muted-foreground mb-4" />
      <p className="text-muted-foreground">{message}</p>
    </div>
  );
}
