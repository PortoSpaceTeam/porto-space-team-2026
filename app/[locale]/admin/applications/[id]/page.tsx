import { notFound } from "next/navigation";
import {
  getApplicationByApplicationId,
  updateApplicationStatus,
} from "@/lib/actions/applications";
import { ApplicationDetail } from "./_components/application-detail";

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
}

const ApplicationDetailPage = async ({ params }: PageProps) => {
  const { locale, id } = await params;

  const result = await getApplicationByApplicationId(id);
  if (!result.success) {
    notFound();
  }

  let application = result.data;
  if (application.status === "new") {
    const updated = await updateApplicationStatus(application.id, "read");
    if (updated.success) {
      application = updated.data;
    }
  }

  return <ApplicationDetail application={application} locale={locale} />;
};

export default ApplicationDetailPage;
