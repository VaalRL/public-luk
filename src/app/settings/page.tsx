import { getCompanies } from "@/app/actions/company";
import { getParserTemplates } from "@/app/actions/parser";
import { getInvoiceItemTemplates } from "@/app/actions/invoice-item-template";
import { getNotificationTemplates } from "@/app/actions/notification-templates";
import { getPdfTemplate } from "@/app/actions/pdf-template";
import { CompanyManagement } from "@/components/company-management";
import { ParserManagement } from "@/components/parser-management";
import { DataBackup } from "@/components/data-backup";
import { InvoiceItemTemplateManagement } from "@/components/invoice-item-template-management";
import { NotificationTemplatesSettings } from "@/components/notification-templates-settings";
import { PdfTemplateSettings } from "@/components/pdf-template-settings";
import { AboutSection } from "@/components/about-section";
import { DangerZone } from "@/components/danger-zone";
import { SystemMonitor } from "@/components/system-monitor";
import { SecurityDashboard } from "@/components/security-dashboard";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { SettingsTabsList } from "@/components/settings-tabs-list";
import { getT } from "@/lib/i18n/server";

// Force dynamic rendering to avoid build-time database access
export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
    const t = await getT();
    const companies = await getCompanies();
    const parserTemplates = await getParserTemplates();
    const invoiceItemTemplates = await getInvoiceItemTemplates();
    const notificationTemplates = await getNotificationTemplates();
    const pdfTemplate = await getPdfTemplate();

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">{t("settings.title")}</h2>
                <p className="text-muted-foreground">
                    {t("settings.subtitle")}
                </p>
            </div>

            <Tabs defaultValue="company" className="flex flex-col md:flex-row gap-8" orientation="vertical">
                <SettingsTabsList />

                <main className="flex-1">
                    <TabsContent value="company" className="mt-0">
                        <CompanyManagement initialCompanies={companies} />
                    </TabsContent>
                    <TabsContent value="parser" className="mt-0">
                        <ParserManagement initialTemplates={parserTemplates} />
                    </TabsContent>
                    <TabsContent value="invoice-items" className="mt-0">
                        <InvoiceItemTemplateManagement initialTemplates={invoiceItemTemplates} />
                    </TabsContent>
                    <TabsContent value="notifications" className="mt-0">
                        <NotificationTemplatesSettings templates={notificationTemplates} />
                    </TabsContent>
                    <TabsContent value="pdf-template" className="mt-0">
                        <PdfTemplateSettings initialTemplate={pdfTemplate} />
                    </TabsContent>
                    <TabsContent value="monitoring" className="mt-0">
                        <SystemMonitor />
                    </TabsContent>
                    <TabsContent value="security" className="mt-0">
                        <SecurityDashboard />
                    </TabsContent>
                    <TabsContent value="backup" className="mt-0">
                        <DataBackup />
                    </TabsContent>
                    <TabsContent value="about" className="mt-0">
                        <AboutSection />
                    </TabsContent>
                    <TabsContent value="danger" className="mt-0">
                        <DangerZone />
                    </TabsContent>
                </main>
            </Tabs>
        </div>
    );
}
