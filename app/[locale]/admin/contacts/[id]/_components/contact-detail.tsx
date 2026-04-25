"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useIntlayer } from "next-intlayer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Archive,
  ArrowLeft,
  CheckCircle,
  Copy,
  Mail,
  MessageCircle,
} from "lucide-react";
import { toast } from "sonner";
import { updateContactStatus, type ContactData } from "@/lib/actions/contacts";
import type { ContactStatus, ContactSubject } from "@/models/Contact";

interface ContactDetailProps {
  contact: ContactData;
  locale: string;
}

export function ContactDetail({
  contact: initialContact,
  locale,
}: ContactDetailProps) {
  const content = useIntlayer("admin-contacts-page");
  const router = useRouter();
  const [contact, setContact] = useState(initialContact);
  const [isLoading, setIsLoading] = useState(false);

  const updateStatus = async (status: ContactStatus) => {
    setIsLoading(true);
    const result = await updateContactStatus(contact.id, status);
    setIsLoading(false);

    if (result.success) {
      setContact(result.data);
      toast.success("Status updated");
      router.refresh();
    } else {
      toast.error("Failed to update status");
    }
  };

  const copyEmail = () => {
    navigator.clipboard.writeText(contact.email);
    toast.success("Email copied to clipboard");
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const getSubjectLabel = (subject: ContactSubject) =>
    content.subjects[subject];

  const getStatusLabel = (status: ContactStatus) => content.statuses[status];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/${locale}/admin/contacts`}>
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
              {contact.ticketId}
            </span>
          </h1>
          <p className="text-muted-foreground text-sm">
            {formatDate(contact.createdAt)}
          </p>
        </div>
        <Badge variant="outline">{getStatusLabel(contact.status)}</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="p-4 rounded-md border">
          <p className="text-sm font-medium text-muted-foreground">
            {content.dialog.from}
          </p>
          <p className="text-sm">
            {contact.name} &lt;{contact.email}&gt;
          </p>
        </div>
        <div className="p-4 rounded-md border">
          <p className="text-sm font-medium text-muted-foreground">
            {content.dialog.subject}
          </p>
          <p className="text-sm">{getSubjectLabel(contact.subject)}</p>
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-muted-foreground mb-2">
          {content.dialog.message}
        </p>
        <div className="bg-muted/50 rounded-md p-4 text-sm whitespace-pre-wrap break-words">
          {contact.message}
        </div>
      </div>

      <div className="flex flex-wrap justify-between gap-2 pt-4 border-t">
        <div className="flex flex-wrap gap-2">
          {contact.status !== "read" && (
            <Button
              variant="outline"
              onClick={() => updateStatus("read")}
              disabled={isLoading}
            >
              <CheckCircle className="size-4" />
              {content.actions.markAsRead}
            </Button>
          )}
          {contact.status !== "replied" && (
            <Button
              variant="outline"
              onClick={() => updateStatus("replied")}
              disabled={isLoading}
            >
              <MessageCircle className="size-4" />
              {content.actions.markAsReplied}
            </Button>
          )}
          {contact.status !== "archived" && (
            <Button
              variant="outline"
              onClick={() => updateStatus("archived")}
              disabled={isLoading}
            >
              <Archive className="size-4" />
              {content.actions.archive}
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={copyEmail}>
            <Copy className="size-4" />
            {content.actions.copyEmail}
          </Button>
          <Button
            onClick={() => {
              window.location.href = `mailto:${contact.email}?subject=Re: [${contact.ticketId}]`;
              updateStatus("replied");
            }}
          >
            <Mail className="size-4" />
            {content.dialog.reply}
          </Button>
        </div>
      </div>
    </div>
  );
}
