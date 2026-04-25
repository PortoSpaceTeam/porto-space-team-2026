"use server";

import { connectDB } from "@/lib/db";
import { Contacts, type ContactStatus, type ContactSubject } from "@/models/Contact";
import { getAdminSession, type ActionResult } from "./users";

export type ContactData = {
  id: string;
  ticketId: string;
  email: string;
  name: string;
  subject: ContactSubject;
  message: string;
  status: ContactStatus;
  createdAt: string;
};

function mapContactToData(contact: {
  _id: { toString(): string };
  ticketId: string;
  email: string;
  name: string;
  subject: ContactSubject;
  message: string;
  status: ContactStatus;
  createdAt: Date;
}): ContactData {
  return {
    id: contact._id.toString(),
    ticketId: contact.ticketId,
    email: contact.email,
    name: contact.name,
    subject: contact.subject,
    message: contact.message,
    status: contact.status,
    createdAt: contact.createdAt.toISOString(),
  };
}

export async function getContactByTicketId(
  ticketId: string,
): Promise<ActionResult<ContactData>> {
  const session = await getAdminSession();
  if (!session) {
    return { success: false, error: "Unauthorized" };
  }

  await connectDB();
  const contact = await Contacts.findOne({ ticketId });

  if (!contact) {
    return { success: false, error: "Contact not found" };
  }

  return { success: true, data: mapContactToData(contact) };
}

export async function getContacts(): Promise<ActionResult<ContactData[]>> {
  const session = await getAdminSession();
  if (!session) {
    return { success: false, error: "Unauthorized" };
  }

  await connectDB();
  const contacts = await Contacts.find().sort({ createdAt: -1 });

  const data: ContactData[] = contacts.map(mapContactToData);

  return { success: true, data };
}

export async function updateContactStatus(
  id: string,
  status: ContactStatus
): Promise<ActionResult<ContactData>> {
  const session = await getAdminSession();
  if (!session) {
    return { success: false, error: "Unauthorized" };
  }

  await connectDB();

  const contact = await Contacts.findByIdAndUpdate(
    id,
    { status },
    { new: true }
  );

  if (!contact) {
    return { success: false, error: "Contact not found" };
  }

  return { success: true, data: mapContactToData(contact) };
}
