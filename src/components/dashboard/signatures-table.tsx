"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Badge } from "~/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Loading } from "~/components/ui/loading";
import { 
  MoreHorizontal, 
  Send, 
  Eye,
  Mail,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  Filter,
  Users,
  FileText
} from "lucide-react";
import { api } from "~/utils/api";
import { toast } from "sonner";

type SignatureStatus = "PENDING" | "SIGNED" | "DECLINED" | "EXPIRED";

const statusConfig = {
  PENDING: { label: "Pending", variant: "default" as const, icon: Clock },
  SIGNED: { label: "Signed", variant: "default" as const, icon: CheckCircle2 },
  DECLINED: { label: "Declined", variant: "destructive" as const, icon: XCircle },
  EXPIRED: { label: "Expired", variant: "secondary" as const, icon: AlertTriangle },
};

export function SignaturesTable() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<SignatureStatus | "ALL">("ALL");
  
  const { data: documents, isLoading, error } = api.documents.getAll.useQuery();
  const utils = api.useUtils();

  const resendSignature = api.signatures.resend.useMutation({
    onSuccess: () => {
      toast.success("Signature request resent successfully");
      void utils.documents.getAll.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to resend signature request");
    },
  });

  // Flatten all signatures from all documents
  const allSignatures = documents?.flatMap(doc => 
    doc.signatures?.map(signature => ({
      ...signature,
      document: doc
    })) || []
  ) || [];

  const filteredSignatures = allSignatures.filter(signature => {
    const matchesSearch = 
      signature.recipientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      signature.recipientEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      signature.document.title.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "ALL" || signature.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleResend = async (signatureId: string) => {
    await resendSignature.mutateAsync({ signatureId });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Loading className="h-6 w-6" />
          <span>Loading signature requests...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Failed to load signature requests</p>
      </div>
    );
  }

  if (filteredSignatures.length === 0 && !searchQuery && statusFilter === "ALL") {
    return (
      <div className="text-center py-12">
        <Users className="h-16 w-16 mx-auto text-muted-foreground mb-4 opacity-50" />
        <h3 className="text-lg font-medium mb-2">No signature requests yet</h3>
        <p className="text-muted-foreground mb-4">
          Upload a document and send it for signature to get started
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by recipient or document..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              {statusFilter === "ALL" ? "All Status" : statusConfig[statusFilter as SignatureStatus].label}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setStatusFilter("ALL")}>
              All Status
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {Object.entries(statusConfig).map(([status, config]) => (
              <DropdownMenuItem 
                key={status}
                onClick={() => setStatusFilter(status as SignatureStatus)}
              >
                <config.icon className="mr-2 h-4 w-4" />
                {config.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Signatures Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Recipient</TableHead>
              <TableHead>Document</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Requested</TableHead>
              <TableHead>Signed</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSignatures.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No signature requests found matching your criteria
                </TableCell>
              </TableRow>
            ) : (
              filteredSignatures.map((signature) => {
                const statusInfo = statusConfig[signature.status as SignatureStatus];
                const StatusIcon = statusInfo.icon;

                return (
                  <TableRow key={signature.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={undefined} />
                          <AvatarFallback className="text-xs">
                            {signature.recipientName
                              ? signature.recipientName.split(' ').map(n => n[0]).join('')
                              : signature.recipientEmail[0].toUpperCase()
                            }
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {signature.recipientName || "Unknown"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {signature.recipientEmail}
                          </p>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium">{signature.document.title}</p>
                        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                          <FileText className="h-3 w-3" />
                          <span>{signature.document.fileName}</span>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge variant={statusInfo.variant} className="flex items-center space-x-1 w-fit">
                        <StatusIcon className="h-3 w-3" />
                        <span>{statusInfo.label}</span>
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <div className="text-sm">
                        {format(new Date(signature.createdAt), "MMM d, yyyy")}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(signature.createdAt), "h:mm a")}
                      </div>
                    </TableCell>

                    <TableCell>
                      {signature.signedAt ? (
                        <div>
                          <div className="text-sm">
                            {format(new Date(signature.signedAt), "MMM d, yyyy")}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(signature.signedAt), "h:mm a")}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>

                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem>
                            <Eye className="mr-2 h-4 w-4" />
                            View Signature
                          </DropdownMenuItem>
                          {signature.status === "PENDING" && (
                            <>
                              <DropdownMenuItem
                                onClick={() => handleResend(signature.id)}
                                disabled={resendSignature.isPending}
                              >
                                <Send className="mr-2 h-4 w-4" />
                                Resend Request
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Mail className="mr-2 h-4 w-4" />
                                Send Reminder
                              </DropdownMenuItem>
                            </>
                          )}
                          {signature.status === "SIGNED" && (
                            <DropdownMenuItem>
                              <Eye className="mr-2 h-4 w-4" />
                              View Signed Document
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Table Footer with Stats */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div className="flex items-center space-x-4">
          <span>
            Showing {filteredSignatures.length} of {allSignatures.length} signature requests
          </span>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>{allSignatures.filter(s => s.status === "SIGNED").length} signed</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <span>{allSignatures.filter(s => s.status === "PENDING").length} pending</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span>{allSignatures.filter(s => s.status === "DECLINED").length} declined</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}