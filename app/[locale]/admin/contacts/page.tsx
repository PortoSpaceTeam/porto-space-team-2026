import { NextPageIntlayer } from "next-intlayer";
import { getIntlayer } from "intlayer";
import { getContacts } from "@/lib/actions/contacts";
import { ContactsTable } from "./_components/contacts-table";

const ContactsPage: NextPageIntlayer = async ({ params }) => {
  const { locale } = await params;
  const content = getIntlayer("admin-contacts-page", locale);

  const contactsResult = await getContacts();
  const contacts = contactsResult.success ? contactsResult.data : [];

  const newCount = contacts.filter((c) => c.status === "new").length;
  const readCount = contacts.filter((c) => c.status === "read").length;
  const repliedCount = contacts.filter((c) => c.status === "replied").length;
  const archivedCount = contacts.filter((c) => c.status === "archived").length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">{content.title}</h1>
        <p className="text-muted-foreground">{content.description}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <div className="rounded-md border p-4">
          <p className="text-sm text-muted-foreground">{content.stats.total}</p>
          <p className="text-2xl font-bold">{contacts.length}</p>
        </div>
        <div className="rounded-md border p-4">
          <p className="text-sm text-muted-foreground">{content.stats.new}</p>
          <p className="text-2xl font-bold">{newCount}</p>
        </div>
        <div className="rounded-md border p-4">
          <p className="text-sm text-muted-foreground">{content.stats.read}</p>
          <p className="text-2xl font-bold">{readCount}</p>
        </div>
        <div className="rounded-md border p-4">
          <p className="text-sm text-muted-foreground">{content.stats.replied}</p>
          <p className="text-2xl font-bold0">{repliedCount}</p>
        </div>
        <div className="rounded-md border p-4">
          <p className="text-sm text-muted-foreground">{content.stats.archived}</p>
          <p className="text-2xl font-bold text-muted-foreground">{archivedCount}</p>
        </div>
      </div>

      <ContactsTable initialContacts={contacts} locale={locale} />
    </div>
  );
};

export default ContactsPage;
