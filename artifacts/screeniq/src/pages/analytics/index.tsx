import { AppLayout } from "@/components/app-layout";
import { useGetBusinessMetrics, useGetFrictionAnalytics, getGetBusinessMetricsQueryKey, getGetFrictionAnalyticsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { ArrowRight, BarChart3, Clock, Target, Repeat, Zap, ShieldAlert, Activity } from "lucide-react";
import { 
  Bar, 
  BarChart, 
  CartesianGrid, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip, 
  XAxis, 
  YAxis,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";

export default function Analytics() {
  const { data: metrics, isLoading: metricsLoading } = useGetBusinessMetrics({
    query: { queryKey: getGetBusinessMetricsQueryKey() }
  });

  const { data: friction, isLoading: frictionLoading } = useGetFrictionAnalytics({
    query: { queryKey: getGetFrictionAnalyticsQueryKey() }
  });

  const PIE_COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

  const distributionData = metrics?.checkTypeDistribution 
    ? Object.entries(metrics.checkTypeDistribution).map(([name, value]) => ({
        name: name.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        value
      }))
    : [];

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 pb-12">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Pipeline Analytics</h1>
            <p className="text-muted-foreground mt-1">Key metrics for candidate pipeline health and platform efficiency.</p>
          </div>
          <Link href="/analytics/benchmarks" className="flex items-center gap-2 text-sm font-medium text-primary hover:underline">
            View Industry Benchmarks <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* OKR Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard 
            title="Attach Rate" 
            value={metrics ? `${(metrics.attachRate * 100).toFixed(1)}%` : "-"} 
            subtitle="Candidates w/ screenings"
            icon={<Target className="w-5 h-5 text-blue-500" />}
            loading={metricsLoading}
            good={metrics ? metrics.attachRate > 0.8 : undefined}
          />
          <MetricCard 
            title="Conversion Rate" 
            value={metrics ? `${(metrics.conversionRate * 100).toFixed(1)}%` : "-"} 
            subtitle="Clear without adverse action"
            icon={<Zap className="w-5 h-5 text-green-500" />}
            loading={metricsLoading}
            good={metrics ? metrics.conversionRate > 0.9 : undefined}
          />
          <MetricCard 
            title="Re-run Rate (RPR)" 
            value={metrics ? `${(metrics.reRunRate * 100).toFixed(1)}%` : "-"} 
            subtitle="Screened more than once"
            icon={<Repeat className="w-5 h-5 text-amber-500" />}
            loading={metricsLoading}
            good={metrics ? metrics.reRunRate < 0.1 : undefined}
          />
          <MetricCard 
            title="Time to Value" 
            value={metrics ? `${metrics.avgTimeToValueHours.toFixed(1)}h` : "-"} 
            subtitle="Creation to completion"
            icon={<Clock className="w-5 h-5 text-purple-500" />}
            loading={metricsLoading}
            good={metrics ? metrics.avgTimeToValueHours < 48 : undefined}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Check Type Distribution */}
          <Card className="shadow-sm border-border">
            <CardHeader className="border-b bg-muted/20">
              <CardTitle>Check Type Distribution</CardTitle>
              <CardDescription>Volume of screens broken down by type.</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {metricsLoading ? (
                <div className="h-[300px] w-full flex items-center justify-center">
                  <Skeleton className="w-full h-full" />
                </div>
              ) : distributionData.length > 0 ? (
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={distributionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {distributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: 'var(--radius)' }}
                      />
                      <Legend layout="vertical" verticalAlign="middle" align="right" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No distribution data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Friction Score by Check Type */}
          <Card className="shadow-sm border-border">
            <CardHeader className="border-b bg-muted/20 pb-4">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>Friction Analytics</CardTitle>
                  <CardDescription className="mt-1">Friction score (0-100) per check type based on delays, flags, and disputes.</CardDescription>
                </div>
                {friction && (
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-semibold text-muted-foreground uppercase">Overall Friction</span>
                    <span className={`text-2xl font-bold ${friction.overallFrictionScore > 30 ? 'text-amber-500' : 'text-green-500'}`}>
                      {friction.overallFrictionScore.toFixed(0)}
                    </span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {frictionLoading ? (
                <div className="h-[300px] w-full flex items-center justify-center">
                  <Skeleton className="w-full h-full" />
                </div>
              ) : friction?.byCheckType && friction.byCheckType.length > 0 ? (
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={friction.byCheckType}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="checkType" 
                        tickFormatter={(val) => val.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                        dy={10}
                      />
                      <YAxis 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      />
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: 'var(--radius)' }}
                        formatter={(value: number) => [value.toFixed(1), 'Friction Score']}
                      />
                      <Bar 
                        dataKey="frictionScore" 
                        name="Friction Score" 
                        radius={[4, 4, 0, 0]}
                        barSize={32}
                      >
                        {
                          friction.byCheckType.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.frictionScore > 30 ? 'hsl(var(--destructive))' : 'hsl(var(--primary))'} />
                          ))
                        }
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No friction data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

function MetricCard({ title, value, icon, loading, subtitle, good }: { 
  title: string, 
  value?: string | number, 
  icon: React.ReactNode, 
  loading: boolean, 
  subtitle: string,
  good?: boolean
}) {
  return (
    <Card className="shadow-sm border-border relative overflow-hidden">
      {good !== undefined && (
        <div className={`absolute top-0 left-0 w-1 h-full ${good ? 'bg-green-500' : 'bg-amber-500'}`} />
      )}
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="p-2.5 bg-muted rounded-xl">
            {icon}
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{title}</p>
          {loading ? (
            <Skeleton className="h-9 w-24 mt-2 mb-1" />
          ) : (
            <h3 className="text-3xl font-extrabold mt-1 mb-1 tracking-tight text-foreground">{value || 0}</h3>
          )}
          <p className="text-xs text-muted-foreground font-medium">{subtitle}</p>
        </div>
      </CardContent>
    </Card>
  );
}