import { notFound } from "next/navigation";
import {
  getContactByTicketId,
  updateContactStatus,
} from "@/lib/actions/contacts";
import { ContactDetail } from "./_components/contact-detail";

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
}

const ContactDetailPage = async ({ params }: PageProps) => {
  const { locale, id } = await params;

  const result = await getContactByTicketId(id);
  if (!result.success) {
    notFound();
  }

  let contact = result.data;
  if (contact.status === "new") {
    const updated = await updateContactStatus(contact.id, "read");
    if (updated.success) {
      contact = updated.data;
    }
  }

  return <ContactDetail contact={contact} locale={locale} />;
};

export default ContactDetailPage;
