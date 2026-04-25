"use client";

import { useIntlayer } from "next-intlayer";
import { useState, useTransition, useOptimistic, useRef } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { toast } from "sonner";
import {
  MoreHorizontal,
  Upload,
  FileText,
  Trash2,
  Send,
  ExternalLink,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import type { FileUploadRoute } from "@/app/api/files/route";
import {
  createNewsletter,
  deleteNewsletter,
  sendNewsletter,
  type NewsletterData,
} from "@/lib/actions/newsletters";

type OptimisticAction =
  | { type: "add"; newsletter: NewsletterData }
  | { type: "delete"; newsletterId: string }
  | { type: "sent"; newsletterId: string; sentCount: number };

interface NewslettersManagerProps {
  initialNewsletters: NewsletterData[];
  activeSubscribersCount: number;
}

export function NewslettersManager({
  initialNewsletters,
  activeSubscribersCount,
}: NewslettersManagerProps) {
  const content = useIntlayer("admin-newsletter-page");
  const [isPending, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);

  const [titleEn, setTitleEn] = useState("");
  const [titlePt, setTitlePt] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [titleEnError, setTitleEnError] = useState<string | null>(null);
  const [titlePtError, setTitlePtError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [newsletterToDelete, setNewsletterToDelete] =
    useState<NewsletterData | null>(null);

  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [newsletterToSend, setNewsletterToSend] =
    useState<NewsletterData | null>(null);
  const [emailContent, setEmailContent] = useState("");
  const [isSending, setIsSending] = useState(false);

  const [optimisticNewsletters, addOptimisticUpdate] = useOptimistic(
    initialNewsletters,
    (state: NewsletterData[], action: OptimisticAction) => {
      switch (action.type) {
        case "add":
          return [action.newsletter, ...state];
        case "delete":
          return state.filter((n) => n.id !== action.newsletterId);
        case "sent":
          return state.map((n) =>
            n.id === action.newsletterId
              ? { ...n, sentAt: new Date().toISOString(), sentCount: action.sentCount }
              : n
          );
        default:
          return state;
      }
    }
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== "application/pdf") {
        setFileError("Only PDF files are allowed");
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setFileError(null);
    }
  };

  const handleUpload = async () => {
    let hasError = false;

    if (!titleEn.trim()) {
      setTitleEnError("English title is required");
      hasError = true;
    }

    if (!titlePt.trim()) {
      setTitlePtError("Portuguese title is required");
      hasError = true;
    }

    if (!file) {
      setFileError("PDF file is required");
      hasError = true;
    }

    if (hasError) return;

    setIsUploading(true);

    try {
      const filesApi = apiClient<FileUploadRoute>("/api/files");
      const formData = new FormData();
      formData.append("file", file!);

      const uploadResult = await filesApi.post({ input: formData });

      if (!uploadResult.success) {
        toast.error(content.newsletters.toast.error.value);
        setIsUploading(false);
        return;
      }

      startTransition(async () => {
        const result = await createNewsletter({
          title: { en: titleEn.trim(), pt: titlePt.trim() },
          pdfUrl: uploadResult.data.url,
          pdfFileName: uploadResult.data.fileName,
        });

        if (result.success) {
          addOptimisticUpdate({ type: "add", newsletter: result.data });
          toast.success(content.newsletters.toast.uploadSuccess.value);
          setTitleEn("");
          setTitlePt("");
          setFile(null);
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        } else {
          toast.error(result.error || content.newsletters.toast.error.value);
        }
      });
    } catch {
      toast.error(content.newsletters.toast.error.value);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = () => {
    if (!newsletterToDelete) return;
    const newsletterId = newsletterToDelete.id;
    setDeleteDialogOpen(false);
    setNewsletterToDelete(null);

    startTransition(async () => {
      addOptimisticUpdate({ type: "delete", newsletterId });
      const result = await deleteNewsletter(newsletterId);
      if (result.success) {
        toast.success(content.newsletters.toast.deleteSuccess.value);
      } else {
        toast.error(content.newsletters.toast.error.value);
      }
    });
  };

  const handleSend = () => {
    if (!newsletterToSend || !emailContent.trim()) return;

    const newsletterId = newsletterToSend.id;
    const content_text = emailContent.trim();

    setIsSending(true);

    startTransition(async () => {
      try {
        const result = await sendNewsletter(newsletterId, content_text);

        if (result.success) {
          addOptimisticUpdate({
            type: "sent",
            newsletterId,
            sentCount: result.data.sentCount,
          });
          toast.success(
            `${content.newsletters.toast.sendSuccess.value} (${result.data.sentCount} ${content.newsletters.sendDialog.subscribersCount.value})`
          );
          setSendDialogOpen(false);
          setNewsletterToSend(null);
          setEmailContent("");
        } else {
          toast.error(result.error || content.newsletters.toast.error.value);
        }
      } catch {
        toast.error(content.newsletters.toast.error.value);
      } finally {
        setIsSending(false);
      }
    });
  };

  const getStatusBadge = (sentAt: string | null) => {
    if (sentAt) {
      return <Badge variant="default">{content.newsletters.status.sent}</Badge>;
    }
    return <Badge variant="secondary">{content.newsletters.status.draft}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="rounded-md border p-4">
        <h3 className="font-medium mb-2">{content.newsletters.upload}</h3>
        <p className="text-sm text-muted-foreground mb-4">
          {content.newsletters.uploadDescription}
        </p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field data-invalid={!!titleEnError}>
            <FieldLabel>{content.newsletters.titleLabelEn}</FieldLabel>
            <Input
              value={titleEn}
              onChange={(e) => {
                setTitleEn(e.target.value);
                if (titleEnError) setTitleEnError(null);
              }}
              placeholder={content.newsletters.titlePlaceholderEn.value}
              disabled={isUploading}
            />
            {titleEnError && <FieldError>{titleEnError}</FieldError>}
          </Field>

          <Field data-invalid={!!titlePtError}>
            <FieldLabel>{content.newsletters.titleLabelPt}</FieldLabel>
            <Input
              value={titlePt}
              onChange={(e) => {
                setTitlePt(e.target.value);
                if (titlePtError) setTitlePtError(null);
              }}
              placeholder={content.newsletters.titlePlaceholderPt.value}
              disabled={isUploading}
            />
            {titlePtError && <FieldError>{titlePtError}</FieldError>}
          </Field>

          <Field data-invalid={!!fileError}>
            <FieldLabel>{content.newsletters.fileLabel}</FieldLabel>
            <Input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              disabled={isUploading}
            />
            {fileError && <FieldError>{fileError}</FieldError>}
          </Field>
        </div>

        <Button
          onClick={handleUpload}
          disabled={isUploading || isPending}
          className="mt-4"
        >
          {isUploading ? (
            <>
              <Spinner className="mr-2" />
              {content.newsletters.uploadButton}
            </>
          ) : (
            <>
              <Upload className="size-4 mr-2" />
              {content.newsletters.uploadButton}
            </>
          )}
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{content.newsletters.table.title}</TableHead>
              <TableHead>{content.newsletters.table.status}</TableHead>
              <TableHead>{content.newsletters.table.sentCount}</TableHead>
              <TableHead>{content.newsletters.table.createdAt}</TableHead>
              <TableHead className="w-17.5">
                {content.newsletters.table.actions}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {optimisticNewsletters.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  {content.newsletters.table.noNewsletters}
                </TableCell>
              </TableRow>
            ) : (
              optimisticNewsletters.map((newsletter) => (
                <TableRow
                  key={newsletter.id}
                  className={isPending ? "opacity-70" : ""}
                >
                  <TableCell>
                    <div className="flex items-start gap-2">
                      <FileText className="size-4 text-muted-foreground mt-0.5" />
                      <div className="flex flex-col">
                        <span className="font-medium">{newsletter.title.en}</span>
                        <span className="text-xs text-muted-foreground">
                          {newsletter.title.pt}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(newsletter.sentAt)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {newsletter.sentCount > 0
                      ? `${newsletter.sentCount} ${content.newsletters.sendDialog.subscribersCount.value}`
                      : "-"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(newsletter.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm">
                          <MoreHorizontal className="size-4" />
                          <span className="sr-only">
                            {content.newsletters.table.actions}
                          </span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>
                          {content.newsletters.table.actions}
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <a
                            href={newsletter.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="size-4" />
                            {content.newsletters.actions.view}
                          </a>
                        </DropdownMenuItem>
                        {!newsletter.sentAt && (
                          <DropdownMenuItem
                            onClick={() => {
                              setNewsletterToSend(newsletter);
                              setSendDialogOpen(true);
                            }}
                            disabled={activeSubscribersCount === 0}
                          >
                            <Send className="size-4" />
                            {content.newsletters.actions.send}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => {
                            setNewsletterToDelete(newsletter);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="size-4" />
                          {content.newsletters.actions.delete}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>{content.newsletters.sendDialog.title}</DialogTitle>
            <DialogDescription>
              {content.newsletters.sendDialog.description}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Field>
              <FieldLabel>{content.newsletters.sendDialog.contentLabel}</FieldLabel>
              <Textarea
                value={emailContent}
                onChange={(e) => setEmailContent(e.target.value)}
                placeholder={content.newsletters.sendDialog.contentPlaceholder.value}
                rows={6}
                disabled={isSending}
              />
            </Field>

            <p className="text-sm text-muted-foreground mt-4">
              {activeSubscribersCount} {content.newsletters.sendDialog.subscribersCount}
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSendDialogOpen(false);
                setEmailContent("");
              }}
              disabled={isSending}
            >
              {content.newsletters.sendDialog.cancel}
            </Button>
            <Button
              onClick={handleSend}
              disabled={isSending || !emailContent.trim()}
            >
              {isSending ? (
                <>
                  <Spinner className="mr-2" />
                  {content.newsletters.sendDialog.sending}
                </>
              ) : (
                <>
                  <Send className="size-4 mr-2" />
                  {content.newsletters.sendDialog.send}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {content.newsletters.confirmDelete.title}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {content.newsletters.confirmDelete.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {content.newsletters.confirmDelete.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {content.newsletters.confirmDelete.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
