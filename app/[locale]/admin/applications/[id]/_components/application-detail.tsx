"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useIntlayer } from "next-intlayer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  Copy,
  ExternalLink,
  FileText,
  Github,
  Linkedin,
  Loader2,
  Mail,
  Trash2,
  UserCheck,
  UserX,
} from "lucide-react";
import { toast } from "sonner";
import {
  deleteApplication,
  updateApplicationStatus,
  type ApplicationData,
} from "@/lib/actions/applications";
import type { ApplicationStatus } from "@/models/Application";

interface ApplicationDetailProps {
  application: ApplicationData;
  locale: string;
}

export function ApplicationDetail({
  application: initialApplication,
  locale,
}: ApplicationDetailProps) {
  const content = useIntlayer("admin-applications-page");
  const router = useRouter();
  const [application, setApplication] = useState(initialApplication);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const updateStatus = async (status: ApplicationStatus) => {
    setIsLoading(true);
    const result = await updateApplicationStatus(application.id, status);
    setIsLoading(false);

    if (result.success) {
      setApplication(result.data);
      toast.success(content.toasts.statusUpdated);
      router.refresh();
    } else {
      toast.error(content.toasts.statusUpdateFailed);
    }
  };

  const handleDelete = async () => {
    setIsLoading(true);
    const result = await deleteApplication(application.id);
    setIsLoading(false);

    if (result.success) {
      toast.success(content.toasts.applicationDeleted);
      router.push(`/${locale}/admin/applications`);
      router.refresh();
    } else {
      toast.error(content.toasts.applicationDeleteFailed);
      setDeleteDialogOpen(false);
    }
  };

  const copyEmail = () => {
    navigator.clipboard.writeText(application.email);
    toast.success(content.toasts.emailCopied);
  };

  const copyMeetLink = () => {
    if (!application.meetLink) return;
    navigator.clipboard.writeText(application.meetLink);
    toast.success(content.toasts.meetLinkCopied);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getYearLabel = (year: number) => {
    return content.years[year.toString() as keyof typeof content.years] || year;
  };

  const getStatusLabel = (status: ApplicationStatus) =>
    content.statuses[status];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/${locale}/admin/applications`}>
            <ArrowLeft className="size-4" />
            {content.dialog.close}
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 flex-wrap">
            {content.dialog.title}
            <span className="font-mono text-sm text-muted-foreground">
              {application.applicationId}
            </span>
          </h1>
          <p className="text-muted-foreground text-sm">
            {formatDate(application.createdAt)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge variant="outline">{getStatusLabel(application.status)}</Badge>
          {application.status === "interview" && application.interviewDate && (
            <span className="text-xs text-muted-foreground">
              {content.dialog.interviewScheduled}:{" "}
              {formatDate(application.interviewDate)}
            </span>
          )}
        </div>
      </div>

      {application.status === "interview" && application.meetLink && (
        <div className="p-4 rounded-md border">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{content.dialog.meetMeeting}</p>
              <p className="text-xs truncate mt-1">{application.meetLink}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={copyMeetLink}>
                <Copy className="size-4" />
                {content.dialog.copyMeetLink}
              </Button>
              <Button
                size="sm"
                onClick={() => window.open(application.meetLink, "_blank")}
              >
                <ExternalLink className="size-4" />
                {content.dialog.joinMeet}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="p-4 rounded-md border">
          <p className="text-sm font-medium text-muted-foreground">
            {content.dialog.applicant}
          </p>
          <p className="text-sm">
            {application.name} &lt;{application.email}&gt;
          </p>
        </div>
        <div className="p-4 rounded-md border">
          <p className="text-sm font-medium text-muted-foreground">
            {content.dialog.course}
          </p>
          <p className="text-sm">{application.course}</p>
          <p className="text-xs text-muted-foreground mt-2">
            {getYearLabel(application.yearOfStudy)}
          </p>
        </div>
      </div>

      {(application.linkedIn || application.github) && (
        <div className="grid gap-4 md:grid-cols-2">
          {application.linkedIn && (
            <a
              href={application.linkedIn}
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 border rounded-md hover:bg-muted/50 transition-colors"
            >
              <p className="text-sm font-medium text-muted-foreground">
                {content.dialog.linkedin}
              </p>
              <p className="text-sm text-primary flex items-center gap-1 mt-1">
                <Linkedin className="size-3" />
                {content.dialog.openInNewTab}
                <ExternalLink className="size-3" />
              </p>
            </a>
          )}
          {application.github && (
            <a
              href={application.github}
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 border rounded-md hover:bg-muted/50 transition-colors"
            >
              <p className="text-sm font-medium text-muted-foreground">
                {content.dialog.github}
              </p>
              <p className="text-sm text-primary flex items-center gap-1 mt-1">
                <Github className="size-3" />
                {content.dialog.openInNewTab}
                <ExternalLink className="size-3" />
              </p>
            </a>
          )}
        </div>
      )}

      {application.relevantExperience && (
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-2">
            {content.dialog.experience}
          </p>
          <div className="bg-muted/50 rounded-md p-4 text-sm whitespace-pre-wrap break-words">
            {application.relevantExperience}
          </div>
        </div>
      )}

      <div>
        <p className="text-sm font-medium text-muted-foreground mb-2">
          {content.dialog.documents}
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <a
            href={application.cvLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 border rounded-md hover:bg-muted/50 transition-colors"
          >
            <div className="w-10 h-10 border flex items-center justify-center text-primary">
              <FileText className="size-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{content.dialog.cv}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                {content.dialog.openInNewTab}
                <ExternalLink className="size-3" />
              </p>
            </div>
          </a>
          <a
            href={application.motivationLetterLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 border rounded-md hover:bg-muted/50 transition-colors"
          >
            <div className="w-10 h-10 border flex items-center justify-center text-primary">
              <FileText className="size-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">
                {content.dialog.motivationLetter}
              </p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                {content.dialog.openInNewTab}
                <ExternalLink className="size-3" />
              </p>
            </div>
          </a>
        </div>
      </div>

      <div className="flex flex-wrap justify-between gap-2 pt-4 border-t">
        <div className="flex flex-wrap gap-2">
          {application.status !== "accepted" && (
            <Button
              variant="outline"
              className="text-green-600 border-green-600/20 hover:bg-green-500/10"
              onClick={() => updateStatus("accepted")}
              disabled={isLoading}
            >
              <UserCheck className="size-4" />
              {content.actions.accept}
            </Button>
          )}
          {application.status !== "rejected" && (
            <Button
              variant="outline"
              className="text-red-600 border-red-600/20 hover:bg-red-500/10"
              onClick={() => updateStatus("rejected")}
              disabled={isLoading}
            >
              <UserX className="size-4" />
              {content.actions.reject}
            </Button>
          )}
          {application.status !== "interview" &&
            application.status !== "accepted" &&
            application.status !== "rejected" && (
              <Button
                variant="outline"
                onClick={() => updateStatus("interview")}
                disabled={isLoading}
              >
                <Calendar className="size-4" />
                {content.actions.scheduleInterview}
              </Button>
            )}
          {application.status !== "read" &&
            application.status !== "interview" &&
            application.status !== "accepted" &&
            application.status !== "rejected" && (
              <Button
                variant="outline"
                onClick={() => updateStatus("read")}
                disabled={isLoading}
              >
                <CheckCircle className="size-4" />
                {content.actions.markAsRead}
              </Button>
            )}
          <Button
            variant="outline"
            className="text-red-600 border-red-600/20 hover:bg-red-500/10"
            onClick={() => setDeleteDialogOpen(true)}
            disabled={isLoading}
          >
            <Trash2 className="size-4" />
            {content.actions.delete}
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={copyEmail}>
            <Copy className="size-4" />
            {content.actions.copyEmail}
          </Button>
          <Button
            onClick={() => {
              window.location.href = `mailto:${application.email}?subject=Re: [${application.applicationId}] Your Application to Porto Space Team`;
            }}
          >
            <Mail className="size-4" />
            {content.dialog.contactApplicant}
          </Button>
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{content.deleteDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {content.deleteDialog.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="p-4 bg-muted/50 rounded-md">
            <p className="text-sm font-medium">{application.name}</p>
            <p className="text-sm text-muted-foreground">{application.email}</p>
            <p className="text-xs font-mono text-muted-foreground mt-1">
              {application.applicationId}
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>
              {content.deleteDialog.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {isLoading && <Loader2 className="size-4 animate-spin" />}
              {content.deleteDialog.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
