import { useGetDashboardStats, useGetRecentActivity, useGetBacklogHealth, getGetBacklogHealthQueryKey } from "@workspace/api-client-react";
import { AppLayout } from "@/components/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, AlertTriangle, CheckCircle2, Clock, Users, ShieldAlert, AlertCircle, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: activity, isLoading: activityLoading } = useGetRecentActivity();
  const { data: backlog, isLoading: backlogLoading } = useGetBacklogHealth({
    query: { queryKey: getGetBacklogHealthQueryKey() }
  });

  const isBacklogUnhealthy = backlog ? (backlog.overdueCount > 0 || backlog.onTimeDeliveryRate < 0.85) : false;

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 pb-8">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Command Center</h1>
            <p className="text-muted-foreground mt-1">Overview of compliance pipeline and recent candidate activity.</p>
          </div>
        </div>

        {/* Top Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard 
            title="Active Pipeline" 
            value={stats?.totalCandidates} 
            icon={<Users className="w-5 h-5 text-blue-500" />} 
            loading={statsLoading} 
            subtitle="total candidates tracked"
          />
          <StatCard 
            title="Pending Screens" 
            value={stats?.pendingScreenings} 
            icon={<Clock className="w-5 h-5 text-amber-500" />} 
            loading={statsLoading} 
            subtitle="awaiting completion"
          />
          <StatCard 
            title="Flagged Profiles" 
            value={stats?.flaggedCandidates} 
            icon={<AlertTriangle className="w-5 h-5 text-red-500" />} 
            loading={statsLoading} 
            subtitle="requiring review"
          />
          <StatCard 
            title="Adverse Actions" 
            value={stats?.adverseActionsOpen} 
            icon={<ShieldAlert className="w-5 h-5 text-orange-500" />} 
            loading={statsLoading} 
            subtitle="open workflows"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Feed */}
          <Card className="lg:col-span-2 shadow-sm border-border">
            <CardHeader className="border-b bg-muted/20">
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Live updates from candidate screening runs and reviews.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {activityLoading ? (
                <div className="p-6 space-y-4">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="flex gap-4">
                      <Skeleton className="w-10 h-10 rounded-full" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : activity?.length ? (
                <div className="divide-y">
                  {activity.map(item => (
                    <div key={item.id} className="p-5 hover:bg-muted/30 transition-colors flex items-start gap-4">
                      <div className={`mt-0.5 rounded-full p-2 ${
                        item.type === 'flag_raised' ? 'bg-red-100 text-red-600' :
                        item.type === 'adverse_action_initiated' ? 'bg-orange-100 text-orange-600' :
                        item.type === 'screening_completed' ? 'bg-green-100 text-green-600' :
                        'bg-blue-100 text-blue-600'
                      }`}>
                        {item.type === 'flag_raised' ? <AlertTriangle size={16} /> :
                         item.type === 'adverse_action_initiated' ? <ShieldAlert size={16} /> :
                         item.type === 'screening_completed' ? <CheckCircle2 size={16} /> :
                         <Activity size={16} />}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          <span className="font-semibold">{item.candidateName}</span>
                          {" • "}
                          <span className="text-muted-foreground">{item.description}</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(item.timestamp), "MMM d, h:mm a")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  No recent activity found.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions / Risk Overview */}
          <div className="space-y-8">
            <Card className={`shadow-sm border-2 ${isBacklogUnhealthy ? 'border-red-500/50 bg-red-50/10' : 'border-green-500/50 bg-green-50/10'}`}>
              <CardHeader className="border-b bg-muted/10 pb-4">
                <CardTitle className="flex justify-between items-center text-base">
                  Backlog Health
                  {backlogLoading ? (
                    <Skeleton className="h-5 w-5 rounded-full" />
                  ) : isBacklogUnhealthy ? (
                    <AlertCircle className="text-red-500 w-5 h-5" />
                  ) : (
                    <CheckCircle2 className="text-green-500 w-5 h-5" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-5 space-y-4">
                {backlogLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                ) : backlog ? (
                  <>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground flex items-center gap-2"><Clock className="w-4 h-4" /> Pending Total</span>
                      <span className="font-semibold">{backlog.pendingTotal}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className={`flex items-center gap-2 ${backlog.overdueCount > 0 ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                        <AlertTriangle className="w-4 h-4" /> Overdue SLAs
                      </span>
                      <span className={`font-semibold ${backlog.overdueCount > 0 ? 'text-red-600' : ''}`}>{backlog.overdueCount}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground flex items-center gap-2"><RefreshCw className="w-4 h-4" /> On-Time Delivery</span>
                      <span className={`font-semibold ${backlog.onTimeDeliveryRate < 0.85 ? 'text-red-600' : 'text-green-600'}`}>
                        {(backlog.onTimeDeliveryRate * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground flex items-center gap-2"><Activity className="w-4 h-4" /> 7-Day Throughput</span>
                      <span className="font-semibold">{backlog.throughput7Days} screens</span>
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground text-center py-2">No backlog data available</div>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="border-b bg-muted/20">
                <CardTitle>Risk Breakdown</CardTitle>
                <CardDescription>Current flagged candidate severities.</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {statsLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : (
                  <div className="space-y-5">
                    {Object.entries(stats?.riskBreakdown || {}).map(([level, count]) => (
                      <div key={level} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${
                            level === 'High' ? 'bg-red-500' :
                            level === 'Medium' ? 'bg-amber-500' : 'bg-green-500'
                          }`} />
                          <span className="font-medium">{level} Risk</span>
                        </div>
                        <span className="text-lg font-bold">{count as number}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-primary text-primary-foreground shadow-md border-transparent overflow-hidden relative">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <Activity size={120} />
              </div>
              <CardHeader className="relative z-10">
                <CardTitle className="text-primary-foreground">AI Insight</CardTitle>
                <CardDescription className="text-primary-foreground/80">Compliance pattern detected</CardDescription>
              </CardHeader>
              <CardContent className="relative z-10">
                <p className="text-sm font-medium leading-relaxed">
                  Turnaround times for education verification are 14% slower than last month. Consider initiating screens earlier in the onboarding flow.
                </p>
                <div className="mt-6">
                  <Link href="/compliance" className="text-sm font-bold flex items-center gap-2 hover:underline">
                    View Compliance Metrics
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function StatCard({ title, value, icon, loading, subtitle }: { title: string, value?: number, icon: React.ReactNode, loading: boolean, subtitle: string }) {
  return (
    <Card className="shadow-sm border-border">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            {loading ? (
              <Skeleton className="h-8 w-16 mt-2" />
            ) : (
              <h3 className="text-3xl font-bold mt-1 text-foreground">{value || 0}</h3>
            )}
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
