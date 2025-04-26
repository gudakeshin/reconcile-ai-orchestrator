
import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertCircle, Filter, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Transaction {
  id: string;
  reference: string;
  amount: number;
  currency: string;
  status: 'matched' | 'unmatched' | 'exception';
  source: string;
  destination: string;
  date: string;
}

const dummyTransactions: Transaction[] = [
  { id: "TX-001", reference: "N-23456", amount: 15000, currency: "USD", status: 'matched', source: "Treasury", destination: "GL Account", date: "2025-04-25" },
  { id: "TX-002", reference: "V-78901", amount: 8750.50, currency: "EUR", status: 'matched', source: "Nostro", destination: "Product Control", date: "2025-04-25" },
  { id: "TX-003", reference: "N-34567", amount: 12500, currency: "GBP", status: 'unmatched', source: "Vostro", destination: "Treasury", date: "2025-04-24" },
  { id: "TX-004", reference: "I-45678", amount: 9800, currency: "USD", status: 'exception', source: "Intercompany", destination: "Finance", date: "2025-04-24" },
  { id: "TX-005", reference: "N-56789", amount: 5250.75, currency: "JPY", status: 'matched', source: "Nostro", destination: "Operations", date: "2025-04-23" },
];

interface TransactionTableProps {
  title?: string;
}

export function TransactionTable({ title = "Recent Transactions" }: TransactionTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const transactionsPerPage = 5;

  const filteredTransactions = dummyTransactions.filter((transaction) =>
    transaction.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
    transaction.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
    transaction.destination.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredTransactions.length / transactionsPerPage);
  const currentTransactions = filteredTransactions.slice(
    (currentPage - 1) * transactionsPerPage,
    currentPage * transactionsPerPage
  );

  const getStatusBadge = (status: 'matched' | 'unmatched' | 'exception') => {
    switch (status) {
      case 'matched':
        return (
          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Matched
          </Badge>
        );
      case 'unmatched':
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">
            <XCircle className="h-3 w-3 mr-1" />
            Unmatched
          </Badge>
        );
      case 'exception':
        return (
          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
            <AlertCircle className="h-3 w-3 mr-1" />
            Exception
          </Badge>
        );
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  return (
    <Card>
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      
      <CardContent className="p-4 pt-2">
        <div className="flex items-center justify-between mb-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
          <Button variant="outline" size="sm" className="h-9">
            <Filter className="h-4 w-4 mr-1" />
            Filter
          </Button>
        </div>
        
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentTransactions.length > 0 ? (
                currentTransactions.map((transaction) => (
                  <TableRow key={transaction.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-medium">{transaction.reference}</TableCell>
                    <TableCell>{formatCurrency(transaction.amount, transaction.currency)}</TableCell>
                    <TableCell>{transaction.source}</TableCell>
                    <TableCell>{transaction.destination}</TableCell>
                    <TableCell>{transaction.date}</TableCell>
                    <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4">
                    No transactions found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        
        {filteredTransactions.length > transactionsPerPage && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * transactionsPerPage + 1} to{" "}
              {Math.min(currentPage * transactionsPerPage, filteredTransactions.length)} of{" "}
              {filteredTransactions.length} transactions
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
