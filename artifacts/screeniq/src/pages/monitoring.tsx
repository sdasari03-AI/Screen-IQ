import { useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Clock, Users, Bell, Shield, Car, FileText, X } from "lucide-react";
import { format } from "date-fns";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function useMonitoringStats() {
  return useQuery({ queryKey: ["monitoring-stats"], queryFn: () => fetch(`${BASE}/api/monitoring/stats`).then(r => r.json()) });
}
function useEnrollments() {
  return useQuery({ queryKey: ["monitoring-enrollments"], queryFn: () => fetch(`${BASE}/api/monitoring`).then(r => r.json()) });
}
function useAlerts() {
  return useQuery({ queryKey: ["monitoring-alerts"], queryFn: () => fetch(`${BASE}/api/monitoring/alerts`).then(r => r.json()) });
}

const SEVERITY_CONFIG: Record<string, { label: string; color: string; icon: JSX.Element }> = {
  critical: { label: "Critical", color: "bg-red-100 text-red-700 border-red-200", icon: <AlertTriangle className="w-4 h-4 text-red-500" /> },
  warning:  { label: "Warning",  color: "bg-amber-100 text-amber-700 border-amber-200", icon: <AlertTriangle className="w-4 h-4 text-amber-500" /> },
  info:     { label: "Info",     color: "bg-blue-100 text-blue-700 border-blue-200", icon: <CheckCircle2 className="w-4 h-4 text-blue-500" /> },
};

const ALERT_TYPE_LABELS: Record<string, string> = {
  new_criminal_filing: "New Criminal Filing",
  driving_record_change: "Driving Record Change",
  sanctions_watchlist: "Sanctions / Watchlist",
  license_status_change: "License Status Change",
};

export default function ContinuousMonitoring() {
  const { data: stats, isLoading: statsLoading } = useMonitoringStats();
  const { data: enrollments, isLoading: enrollLoading } = useEnrollments();
  const { data: alerts, isLoading: alertsLoading } = useAlerts();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<string>("all");

  const dismissAlert = useMutation({
    mutationFn: (alertId: number) => fetch(`${BASE}/api/monitoring/alerts/${alertId}/dismiss`, { method: "POST" }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monitoring-alerts"] });
      queryClient.invalidateQueries({ queryKey: ["monitoring-stats"] });
    },
  });

  const filteredAlerts = (alerts || []).filter((a: any) =>
    filter === "all" ? a.status !== "dismissed" : a.severity === filter && a.status !== "dismissed"
  );

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 pb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Continuous Monitoring</h1>
          <p className="text-muted-foreground mt-1">
            Post-hire surveillance for enrolled employees — criminal, driving, sanctions, and license changes.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statsLoading ? Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-24" />) : (<>
            <Card>
              <CardContent className="p-5 flex items-start gap-4">
                <div className="p-2 rounded-lg bg-blue-50"><Users className="w-5 h-5 text-blue-500" /></div>
                <div>
                  <p className="text-2xl font-bold">{stats?.totalEnrolled ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Enrolled Employees</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5 flex items-start gap-4">
                <div className="p-2 rounded-lg bg-amber-50"><Bell className="w-5 h-5 text-amber-500" /></div>
                <div>
                  <p className="text-2xl font-bold">{stats?.alertsLast30Days ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Alerts (30 days)</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5 flex items-start gap-4">
                <div className="p-2 rounded-lg bg-red-50"><AlertTriangle className="w-5 h-5 text-red-500" /></div>
                <div>
                  <p className="text-2xl font-bold">{stats?.severityBreakdown?.critical ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Critical Alerts</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5 flex items-start gap-4">
                <div className="p-2 rounded-lg bg-green-50"><Shield className="w-5 h-5 text-green-500" /></div>
                <div>
                  <p className="text-2xl font-bold">{stats?.openAlerts ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Open Alerts</p>
                </div>
              </CardContent>
            </Card>
          </>)}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Alerts */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Active Alerts</h2>
              <div className="flex gap-2">
                {["all", "critical", "warning", "info"].map(f => (
                  <Button key={f} size="sm" variant={filter === f ? "default" : "outline"}
                    className="capitalize text-xs" onClick={() => setFilter(f)}>
                    {f === "all" ? "All" : f}
                  </Button>
                ))}
              </div>
            </div>

            {alertsLoading ? (
              <div className="space-y-3">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
            ) : filteredAlerts.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground border rounded-xl">
                <Bell className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No active alerts</p>
                <p className="text-sm mt-1">All clear for the selected filter</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredAlerts.map((alert: any) => {
                  const sev = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.info;
                  return (
                    <Card key={alert.id} className={`border ${alert.severity === "critical" ? "border-red-200" : alert.severity === "warning" ? "border-amber-200" : "border-border"}`}>
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className="mt-0.5 shrink-0">{sev.icon}</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className="font-bold text-sm">{alert.candidateName}</span>
                                <Badge variant="outline" className={`text-[10px] px-2 ${sev.color}`}>{sev.label}</Badge>
                                <Badge variant="secondary" className="text-[10px] px-2">
                                  {ALERT_TYPE_LABELS[alert.alertType] || alert.alertType}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground leading-relaxed">{alert.description}</p>
                              {alert.charge && (
                                <div className="mt-2 text-xs font-mono bg-muted px-3 py-1.5 rounded-md text-muted-foreground">
                                  {alert.charge}
                                </div>
                              )}
                              {alert.filedAt && (
                                <p className="text-xs text-muted-foreground mt-2">
                                  Filed: {format(new Date(alert.filedAt), "MMM d, yyyy")}
                                </p>
                              )}
                              {alert.severity === "critical" && (
                                <div className="mt-3 flex gap-2 flex-wrap">
                                  <Button size="sm" variant="outline" className="text-xs h-7">Review</Button>
                                  <Button size="sm" variant="outline" className="text-xs h-7">Adjudicate</Button>
                                  <Button size="sm" variant="destructive" className="text-xs h-7">Initiate Adverse Action</Button>
                                </div>
                              )}
                            </div>
                          </div>
                          <Button size="sm" variant="ghost" className="text-muted-foreground shrink-0 h-7 w-7 p-0"
                            onClick={() => dismissAlert.mutate(alert.id)}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Enrolled Employees */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold">Enrolled Employees</h2>
            <Card>
              <CardContent className="p-0">
                {enrollLoading ? (
                  <div className="p-4 space-y-3">{Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
                ) : (enrollments || []).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">No employees enrolled</div>
                ) : (
                  <div className="divide-y">
                    {(enrollments || []).map((e: any) => {
                      const monitorIcons: Record<string, JSX.Element> = {
                        criminal: <Shield className="w-3 h-3" />,
                        driving: <Car className="w-3 h-3" />,
                        sanctions: <AlertTriangle className="w-3 h-3" />,
                        license: <FileText className="w-3 h-3" />,
                      };
                      return (
                        <div key={e.id} className="px-4 py-3 hover:bg-muted/30 transition-colors">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-semibold">{e.candidateName}</p>
                              <p className="text-xs text-muted-foreground">{e.position}</p>
                            </div>
                            <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200">
                              Active
                            </Badge>
                          </div>
                          <div className="flex gap-1.5 mt-2 flex-wrap">
                            {(e.monitorTypes || []).map((t: string) => (
                              <span key={t} className="flex items-center gap-1 text-[10px] bg-muted rounded-full px-2 py-0.5 text-muted-foreground">
                                {monitorIcons[t] || <Clock className="w-3 h-3" />}
                                {t}
                              </span>
                            ))}
                          </div>
                          {e.enrolledAt && (
                            <p className="text-[10px] text-muted-foreground mt-1">
                              Enrolled {format(new Date(e.enrolledAt), "MMM d, yyyy")}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-muted/30 border-dashed">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground mb-3">
                  Enroll a cleared candidate by opening their profile and clicking "Enroll in Monitoring".
                </p>
                <div className="flex flex-col gap-2 text-xs text-left text-muted-foreground">
                  {[
                    "Criminal records",
                    "Driving record changes",
                    "Sanctions & watchlist",
                    "Professional license status",
                  ].map(t => (
                    <div key={t} className="flex items-center gap-2">
                      <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />
                      {t}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
