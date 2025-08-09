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
import { Loading } from "~/components/ui/loading";
import { 
  MoreHorizontal, 
  Eye, 
  Edit, 
  Send, 
  Trash2, 
  Download,
  Search,
  Filter,
  FileText,
  Users,
  Clock,
  CheckCircle2
} from "lucide-react";
import { api } from "~/utils/api";
import { toast } from "sonner";

type DocumentStatus = "DRAFT" | "SENT" | "COMPLETED" | "EXPIRED" | "CANCELLED";

const statusConfig = {
  DRAFT: { label: "Draft", variant: "secondary" as const, icon: FileText },
  SENT: { label: "Sent", variant: "default" as const, icon: Send },
  COMPLETED: { label: "Completed", variant: "default" as const, icon: CheckCircle2 },
  EXPIRED: { label: "Expired", variant: "destructive" as const, icon: Clock },
  CANCELLED: { label: "Cancelled", variant: "outline" as const, icon: Trash2 },
};

export function DocumentsTable() {
  const [searchQuery, setSearchQuery] = useState("");
  
  const { data: documents, isLoading, error } = api.documents.getAll.useQuery();
  const utils = api.useUtils();

  const deleteDocument = api.documents.delete.useMutation({
    onSuccess: () => {
      toast.success("Document deleted successfully");
      void utils.documents.getAll.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete document");
    },
  });

  const updateStatus = api.documents.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Document status updated");
      void utils.documents.getAll.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update document");
    },
  });

  const handleDelete = async (documentId: string) => {
    if (window.confirm("Are you sure you want to delete this document?")) {
      await deleteDocument.mutateAsync({ id: documentId });
    }
  };

  const handleStatusChange = async (documentId: string, status: DocumentStatus) => {
    await updateStatus.mutateAsync({ id: documentId, status });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Loading className="h-6 w-6" />
          <span>Loading documents...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Failed to load documents</p>
      </div>
    );
  }

  const filteredDocuments = documents?.filter(doc =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.description?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  if (filteredDocuments.length === 0 && !searchQuery) {
    return (
      <div className="text-center py-12">
        <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4 opacity-50" />
        <h3 className="text-lg font-medium mb-2">No documents yet</h3>
        <p className="text-muted-foreground mb-4">
          Upload your first document to get started
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
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="sm">
          <Filter className="h-4 w-4 mr-2" />
          Filter
        </Button>
      </div>

      {/* Documents Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Document</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Recipients</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredDocuments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No documents found matching your search
                </TableCell>
              </TableRow>
            ) : (
              filteredDocuments.map((document) => {
                const statusInfo = statusConfig[document.status as DocumentStatus];
                const StatusIcon = statusInfo.icon;
                const completedSignatures = document.signatures?.filter(s => s.status === "SIGNED").length || 0;
                const totalSignatures = document.signatures?.length || 0;

                return (
                  <TableRow key={document.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium">{document.title}</p>
                        {document.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {document.description}
                          </p>
                        )}
                        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                          <FileText className="h-3 w-3" />
                          <span>{document.fileName}</span>
                          <span>({(document.fileSize / 1024 / 1024).toFixed(1)} MB)</span>
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
                      <div className="flex items-center space-x-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {completedSignatures}/{totalSignatures} signed
                        </span>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="text-sm">
                        {format(new Date(document.createdAt), "MMM d, yyyy")}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(document.createdAt), "h:mm a")}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="text-sm">
                        {format(new Date(document.updatedAt), "MMM d, yyyy")}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(document.updatedAt), "h:mm a")}
                      </div>
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
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Download className="mr-2 h-4 w-4" />
                            Download
                          </DropdownMenuItem>
                          {document.status === "DRAFT" && (
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(document.id, "SENT")}
                            >
                              <Send className="mr-2 h-4 w-4" />
                              Send for Signature
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDelete(document.id)}
                            disabled={deleteDocument.isPending}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
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

      {/* Table Footer */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div>
          Showing {filteredDocuments.length} of {documents?.length || 0} documents
        </div>
      </div>
    </div>
  );
}