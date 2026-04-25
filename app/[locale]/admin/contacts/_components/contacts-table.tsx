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
  MoreHorizontal,
  Eye,
  CheckCircle,
  MessageCircle,
  Archive,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import type { ContactData, UpdateContactRoute } from "@/app/api/contacts/route";
import type { ContactStatus, ContactSubject } from "@/models/Contact";

interface ContactsTableProps {
  initialContacts: ContactData[];
  locale: string;
}

export function ContactsTable({
  initialContacts,
  locale,
}: ContactsTableProps) {
  const content = useIntlayer("admin-contacts-page");
  const [contacts, setContacts] = useState(initialContacts);

  const updateStatus = async (id: string, status: ContactStatus) => {
    const contactsApi = apiClient<UpdateContactRoute>("/api/contacts");
    const result = await contactsApi.patch({
      input: { id, status },
    });

    if (result.success) {
      setContacts((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status } : c)),
      );
      toast.success("Status updated");
    } else {
      toast.error("Failed to update status");
    }
  };

  const copyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
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

  if (contacts.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {content.table.empty}
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{content.table.ticketId}</TableHead>
            <TableHead>{content.table.name}</TableHead>
            <TableHead>{content.table.email}</TableHead>
            <TableHead>{content.table.subject}</TableHead>
            <TableHead>{content.table.status}</TableHead>
            <TableHead>{content.table.date}</TableHead>
            <TableHead className="w-17.5">{content.table.actions}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contacts.map((contact) => (
            <TableRow key={contact.id}>
              <TableCell className="font-mono text-sm">
                <Link
                  href={`/${locale}/admin/contacts/${contact.ticketId}`}
                  className="hover:underline"
                >
                  {contact.ticketId}
                </Link>
              </TableCell>
              <TableCell className="font-medium">{contact.name}</TableCell>
              <TableCell className="text-muted-foreground">
                {contact.email}
              </TableCell>
              <TableCell>
                <Badge variant="outline">
                  {getSubjectLabel(contact.subject)}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant="outline">{getStatusLabel(contact.status)}</Badge>
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {formatDate(contact.createdAt)}
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
                      <Link href={`/${locale}/admin/contacts/${contact.ticketId}`}>
                        <Eye className="size-4" />
                        {content.actions.view}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => copyEmail(contact.email)}>
                      <Copy className="size-4" />
                      {content.actions.copyEmail}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {contact.status !== "read" && (
                      <DropdownMenuItem
                        onClick={() => updateStatus(contact.id, "read")}
                      >
                        <CheckCircle className="size-4" />
                        {content.actions.markAsRead}
                      </DropdownMenuItem>
                    )}
                    {contact.status !== "replied" && (
                      <DropdownMenuItem
                        onClick={() => updateStatus(contact.id, "replied")}
                      >
                        <MessageCircle className="size-4" />
                        {content.actions.markAsReplied}
                      </DropdownMenuItem>
                    )}
                    {contact.status !== "archived" && (
                      <DropdownMenuItem
                        onClick={() => updateStatus(contact.id, "archived")}
                      >
                        <Archive className="size-4" />
                        {content.actions.archive}
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
