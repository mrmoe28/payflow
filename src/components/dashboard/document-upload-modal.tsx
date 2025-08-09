"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";
import { Progress } from "~/components/ui/progress";
import { Badge } from "~/components/ui/badge";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { 
  Upload, 
  File, 
  X, 
  Plus,
  AlertCircle,
  CheckCircle,
  Users
} from "lucide-react";
import { api } from "~/utils/api";
import { toast } from "sonner";

const documentFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  recipients: z.array(z.object({
    email: z.string().email("Valid email is required"),
    name: z.string().optional(),
  })).min(1, "At least one recipient is required"),
});

type DocumentFormData = z.infer<typeof documentFormSchema>;

interface DocumentUploadModalProps {
  children: React.ReactNode;
}

export function DocumentUploadModal({ children }: DocumentUploadModalProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  
  const utils = api.useUtils();

  const form = useForm<DocumentFormData>({
    resolver: zodResolver(documentFormSchema),
    defaultValues: {
      title: "",
      description: "",
      recipients: [{ email: "", name: "" }],
    },
  });

  const createDocument = api.documents.create.useMutation({
    onSuccess: () => {
      toast.success("Document uploaded and sent successfully!");
      setOpen(false);
      resetForm();
      void utils.documents.getAll.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to upload document");
    },
  });

  const resetForm = () => {
    setStep(1);
    setFile(null);
    setUploadProgress(0);
    form.reset();
  };

  const handleFileSelect = (selectedFile: File) => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png'
    ];

    if (!allowedTypes.includes(selectedFile.type)) {
      toast.error("Please upload a PDF, Word document, or image file");
      return;
    }

    if (selectedFile.size > maxSize) {
      toast.error("File size must be less than 10MB");
      return;
    }

    setFile(selectedFile);
    form.setValue('title', selectedFile.name.replace(/\.[^/.]+$/, ""));
    
    // Simulate upload progress
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      setUploadProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => setStep(2), 500);
      }
    }, 100);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const addRecipient = () => {
    const current = form.getValues('recipients');
    form.setValue('recipients', [...current, { email: "", name: "" }]);
  };

  const removeRecipient = (index: number) => {
    const current = form.getValues('recipients');
    if (current.length > 1) {
      form.setValue('recipients', current.filter((_, i) => i !== index));
    }
  };

  const onSubmit = async (data: DocumentFormData) => {
    if (!file) return;

    setStep(3);

    // In a real implementation, you'd upload the file to cloud storage first
    // For now, we'll simulate this with a placeholder URL
    const fileUrl = `https://example.com/documents/${file.name}`;

    try {
      await createDocument.mutateAsync({
        title: data.title,
        description: data.description,
        fileUrl,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        recipients: data.recipients,
      });
    } catch {
      setStep(2); // Go back to form on error
    }
  };

  const steps = [
    { number: 1, title: "Upload Document", completed: step > 1 },
    { number: 2, title: "Add Details", completed: step > 2 },
    { number: 3, title: "Send", completed: step > 3 },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Upload New Document</DialogTitle>
          <DialogDescription>
            Upload a document and send it for signature
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-6">
          {steps.map((stepItem, index) => (
            <div key={stepItem.number} className="flex items-center">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                stepItem.completed 
                  ? 'bg-primary text-primary-foreground' 
                  : step === stepItem.number
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}>
                {stepItem.completed ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  stepItem.number
                )}
              </div>
              <span className={`ml-2 text-sm ${
                step === stepItem.number ? 'text-foreground' : 'text-muted-foreground'
              }`}>
                {stepItem.title}
              </span>
              {index < steps.length - 1 && (
                <div className={`w-12 h-px mx-4 ${
                  stepItem.completed ? 'bg-primary' : 'bg-border'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: File Upload */}
        {step === 1 && (
          <div className="space-y-4">
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragOver 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:border-primary/50'
              }`}
              onDrop={handleDrop}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
            >
              <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">
                Drag and drop your document here
              </h3>
              <p className="text-muted-foreground mb-4">
                or click to browse files
              </p>
              <input
                type="file"
                className="hidden"
                id="file-input"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={handleFileInput}
              />
              <Button asChild variant="outline">
                <label htmlFor="file-input" className="cursor-pointer">
                  Choose File
                </label>
              </Button>
            </div>

            {file && (
              <div className="space-y-4">
                <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
                  <File className="w-8 h-8 text-primary" />
                  <div className="flex-1">
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                  <Badge variant="secondary">
                    {file.type.includes('pdf') ? 'PDF' : 
                     file.type.includes('word') ? 'Word' : 'Image'}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              </div>
            )}

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Supported formats: PDF, Word (.doc, .docx), Images (.jpg, .png)
                <br />Maximum file size: 10MB
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Step 2: Document Details & Recipients */}
        {step === 2 && (
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Document Title</Label>
                <Input
                  id="title"
                  {...form.register('title')}
                  placeholder="Enter document title"
                />
                {form.formState.errors.title && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.title.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  {...form.register('description')}
                  placeholder="Add a description for this document"
                  rows={3}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Recipients</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addRecipient}
                    className="flex items-center space-x-1"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Recipient</span>
                  </Button>
                </div>

                {form.watch('recipients').map((_, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <Input
                        {...form.register(`recipients.${index}.email`)}
                        placeholder="Email address"
                        type="email"
                      />
                      <Input
                        {...form.register(`recipients.${index}.name`)}
                        placeholder="Full name (optional)"
                      />
                    </div>
                    {form.watch('recipients').length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeRecipient(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}

                {form.formState.errors.recipients && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.recipients.message}
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
              >
                Back
              </Button>
              <Button type="submit" disabled={createDocument.isPending}>
                <Users className="w-4 h-4 mr-2" />
                {createDocument.isPending ? "Sending..." : "Send for Signature"}
              </Button>
            </div>
          </form>
        )}

        {/* Step 3: Success */}
        {step === 3 && (
          <div className="text-center py-8">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              Document Sent Successfully!
            </h3>
            <p className="text-muted-foreground mb-6">
              Your document has been uploaded and signature requests have been sent to all recipients.
            </p>
            <Button onClick={() => setOpen(false)}>
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}