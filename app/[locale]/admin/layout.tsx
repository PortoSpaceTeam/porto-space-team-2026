import { IntlayerClientProvider, NextLayoutIntlayer } from "next-intlayer";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AdminSidebar } from "./_components/admin-sidebar";
import { AdminHeader } from "./_components/admin-header";
import { auth } from "@/lib/auth";
import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";

export const dynamic = "force-dynamic";

const AdminLayout: NextLayoutIntlayer = async ({ children, params }) => {
  noStore();

  const { locale } = await params;

  const cookieStore = await cookies();
  
  const reqHeaders = await headers();

  const session = await auth.api.getSession({ headers: reqHeaders });


  if (!session || session.user.approvalStatus !== "APPROVED") {
    redirect(`/${locale}/sign-in`);
  }

  const sidebarState = cookieStore.get("sidebar_state");
  const defaultOpen = sidebarState?.value !== "false";

  return (
    <IntlayerClientProvider locale={locale}>
      <SidebarProvider className="" defaultOpen={defaultOpen}>
        <AdminSidebar />
        <SidebarInset className="min-w-0 overflow-x-hidden">
          <AdminHeader />
          <div className="flex flex-1 flex-col gap-4 p-4 min-w-0">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </IntlayerClientProvider>
  );
};

export default AdminLayout;
