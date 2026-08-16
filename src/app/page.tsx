import { getDashboardStats, getMonthlyRevenue, getRecentActivity, getInvoiceReminders } from "@/app/actions/dashboard";
import { DashboardKPIs } from "@/components/dashboard-kpis";
import { RevenueChart } from "@/components/revenue-chart";
import { RecentActivity } from "@/components/recent-activity";
import { MonthlyReconciliationHistory } from "@/components/monthly-reconciliation-history";
import { DashboardTodoList } from "@/components/dashboard-todo-list";
import { FadeIn } from "@/components/ui/motion";

export const revalidate = 0;

export default async function Home() {
  const [stats, monthlyRevenue, activity, reminders] = await Promise.all([
    getDashboardStats(),
    getMonthlyRevenue(6),
    getRecentActivity(),
    getInvoiceReminders(),
  ]);

  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">概覽</h2>
            <p className="text-muted-foreground">
              歡迎回來！這裡是您的財務概況。
            </p>
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={0.1}>
        <DashboardKPIs stats={stats} />
      </FadeIn>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Todo List - First on mobile, right side on desktop */}
        <div className="lg:col-span-1 lg:order-2">
          <FadeIn delay={0.2}>
            <DashboardTodoList reminders={reminders} />
          </FadeIn>
        </div>

        {/* Main content - Second on mobile, left side on desktop */}
        <div className="lg:col-span-2 lg:order-1 space-y-4">
          <FadeIn delay={0.2}>
            <RevenueChart data={monthlyRevenue} />
          </FadeIn>
          <FadeIn delay={0.3}>
            <MonthlyReconciliationHistory />
          </FadeIn>
          <FadeIn delay={0.4}>
            <RecentActivity
              recentInvoices={activity.recentInvoices}
              recentReconciliations={activity.recentReconciliations}
            />
          </FadeIn>
        </div>
      </div>
    </div>
  );
}
