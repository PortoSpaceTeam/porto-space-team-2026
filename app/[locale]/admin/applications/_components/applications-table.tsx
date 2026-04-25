"use client";

import { useState } from "react";
import Link from "next/link";
import { useIntlayer } from "next-intlayer";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import {
  MoreHorizontal,
  Eye,
  CheckCircle,
  Calendar,
  UserCheck,
  UserX,
  Copy,
  FileText,
  Trash2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  updateApplicationStatus,
  deleteApplication,
  type ApplicationData,
} from "@/lib/actions/applications";
import type { ApplicationStatus } from "@/models/Application";

interface ApplicationsTableProps {
  initialApplications: ApplicationData[];
  locale: string;
}

export function ApplicationsTable({
  initialApplications,
  locale,
}: ApplicationsTableProps) {
  const content = useIntlayer("admin-applications-page");
  const [applications, setApplications] = useState(initialApplications);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [applicationToDelete, setApplicationToDelete] =
    useState<ApplicationData | null>(null);

  const updateStatus = async (id: string, status: ApplicationStatus) => {
    setIsLoading(true);
    const result = await updateApplicationStatus(id, status);
    setIsLoading(false);

    if (result.success) {
      setApplications((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status } : a)),
      );
      toast.success(content.toasts.statusUpdated);
    } else {
      toast.error(content.toasts.statusUpdateFailed);
    }
  };

  const handleDeleteApplication = async () => {
    if (!applicationToDelete) return;

    setIsLoading(true);
    const result = await deleteApplication(applicationToDelete.id);
    setIsLoading(false);

    if (result.success) {
      setApplications((prev) =>
        prev.filter((a) => a.id !== applicationToDelete.id),
      );
      toast.success(content.toasts.applicationDeleted);
      setDeleteDialogOpen(false);
      setApplicationToDelete(null);
    } else {
      toast.error(content.toasts.applicationDeleteFailed);
    }
  };

  const openDeleteDialog = (application: ApplicationData) => {
    setApplicationToDelete(application);
    setDeleteDialogOpen(true);
  };

  const copyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    toast.success(content.toasts.emailCopied);
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

  const getStatusLabel = (status: ApplicationStatus) => {
    return content.statuses[status];
  };

  if (applications.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {content.table.empty}
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{content.table.applicationId}</TableHead>
              <TableHead>{content.table.name}</TableHead>
              <TableHead>{content.table.email}</TableHead>
              <TableHead>{content.table.course}</TableHead>
              <TableHead>{content.table.year}</TableHead>
              <TableHead>{content.table.status}</TableHead>
              <TableHead>{content.table.date}</TableHead>
              <TableHead className="w-17.5">{content.table.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {applications.map((application) => (
              <TableRow key={application.id}>
                <TableCell className="font-mono text-sm">
                  <Link
                    href={`/${locale}/admin/applications/${application.applicationId}`}
                    className="hover:underline"
                  >
                    {application.applicationId}
                  </Link>
                </TableCell>
                <TableCell className="font-medium">
                  {application.name}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {application.email}
                </TableCell>
                <TableCell className="text-muted-foreground max-w-32 truncate">
                  {application.course}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {getYearLabel(application.yearOfStudy)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <Badge variant="outline">
                      {getStatusLabel(application.status)}
                    </Badge>
                    {application.status === "interview" &&
                      application.interviewDate && (
                        <span className="text-xs text-muted-foreground">
                          {formatDate(application.interviewDate)}
                        </span>
                      )}
                    {application.status === "interview" &&
                      application.meetLink && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(
                              application.meetLink!,
                            );
                            toast.success(content.toasts.meetLinkCopied);
                          }}
                          className="text-xs flex items-center gap-1 cursor-pointer"
                        >
                          <Copy className="size-3" />
                          Meet
                        </button>
                      )}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {formatDate(application.createdAt)}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link
                          href={`/${locale}/admin/applications/${application.applicationId}`}
                        >
                          <Eye className="size-4" />
                          {content.actions.view}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => copyEmail(application.email)}
                      >
                        <Copy className="size-4" />
                        {content.actions.copyEmail}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <a
                          href={application.cvLink}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <FileText className="size-4" />
                          {content.actions.downloadCV}
                        </a>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <a
                          href={application.motivationLetterLink}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <FileText className="size-4" />
                          {content.actions.downloadLetter}
                        </a>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {application.status !== "read" &&
                        application.status !== "interview" &&
                        application.status !== "accepted" &&
                        application.status !== "rejected" && (
                          <DropdownMenuItem
                            onClick={() => updateStatus(application.id, "read")}
                          >
                            <CheckCircle className="size-4" />
                            {content.actions.markAsRead}
                          </DropdownMenuItem>
                        )}
                      {application.status !== "interview" &&
                        application.status !== "accepted" &&
                        application.status !== "rejected" && (
                          <DropdownMenuItem
                            onClick={() =>
                              updateStatus(application.id, "interview")
                            }
                          >
                            <Calendar className="size-4" />
                            {content.actions.scheduleInterview}
                          </DropdownMenuItem>
                        )}
                      {application.status !== "accepted" && (
                        <DropdownMenuItem
                          onClick={() =>
                            updateStatus(application.id, "accepted")
                          }
                          className="text-green-600"
                        >
                          <UserCheck className="size-4" />
                          {content.actions.accept}
                        </DropdownMenuItem>
                      )}
                      {application.status !== "rejected" && (
                        <DropdownMenuItem
                          onClick={() =>
                            updateStatus(application.id, "rejected")
                          }
                          className="text-red-600"
                        >
                          <UserX className="size-4" />
                          {content.actions.reject}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => openDeleteDialog(application)}
                        className="text-red-600"
                      >
                        <Trash2 className="size-4" />
                        {content.actions.delete}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{content.deleteDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {content.deleteDialog.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {applicationToDelete && (
            <div className="p-4 bg-muted/50 rounded-md">
              <p className="text-sm font-medium">{applicationToDelete.name}</p>
              <p className="text-sm text-muted-foreground">
                {applicationToDelete.email}
              </p>
              <p className="text-xs font-mono text-muted-foreground mt-1">
                {applicationToDelete.applicationId}
              </p>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setDeleteDialogOpen(false);
                setApplicationToDelete(null);
              }}
            >
              {content.deleteDialog.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteApplication}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {isLoading && <Loader2 className="size-4 animate-spin" />}
              {content.deleteDialog.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
