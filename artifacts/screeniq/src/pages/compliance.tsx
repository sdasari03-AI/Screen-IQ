import { AppLayout } from "@/components/app-layout";
import { useGetComplianceMetrics, useGetComplianceTimeSeries, useGetComplianceAiInsight, useGetBenchmarks } from "@workspace/api-client-react";
import { getGetComplianceMetricsQueryKey, getGetComplianceTimeSeriesQueryKey, getGetComplianceAiInsightQueryKey, getGetBenchmarksQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BrainCircuit, Clock, Scale, ShieldCheck, Database, TrendingDown, TrendingUp, BarChart3, Activity } from "lucide-react";
import { 
  Area, 
  AreaChart, 
  Bar, 
  BarChart, 
  CartesianGrid, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip, 
  XAxis, 
  YAxis,
  Legend
} from "recharts";
import { format, parseISO } from "date-fns";

export default function ComplianceMetrics() {
  const { data: metrics, isLoading: metricsLoading } = useGetComplianceMetrics({
    query: { queryKey: getGetComplianceMetricsQueryKey() }
  });

  const { data: timeSeries, isLoading: timeSeriesLoading } = useGetComplianceTimeSeries({ days: 30 }, {
    query: { queryKey: getGetComplianceTimeSeriesQueryKey({ days: 30 }) }
  });

  const { data: insight, isLoading: insightLoading } = useGetComplianceAiInsight({
    query: { queryKey: getGetComplianceAiInsightQueryKey() }
  });

  const { data: benchmarks, isLoading: benchmarksLoading } = useGetBenchmarks({
    query: { queryKey: getGetBenchmarksQueryKey() }
  });

  const formatChartDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "MMM d");
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 pb-12">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            Compliance Intelligence <Badge>Pro</Badge>
          </h1>
          <p className="text-muted-foreground">Monitor screening efficacy, dispute rates, and vendor reliability.</p>
        </div>

        {/* AI Insight Highlight */}
        {insightLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : insight ? (
          <Card className="bg-sidebar border-sidebar-border text-sidebar-foreground shadow-lg overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <BrainCircuit size={200} />
            </div>
            <CardHeader className="relative z-10 border-b border-sidebar-border/50 bg-sidebar/50 backdrop-blur-sm">
              <CardTitle className="text-sidebar-primary-foreground flex items-center gap-2">
                <BrainCircuit className="w-5 h-5 text-sidebar-primary" /> AI Compliance Insight
              </CardTitle>
            </CardHeader>
            <CardContent className="relative z-10 p-6">
              <p className="text-lg font-medium leading-relaxed max-w-4xl">
                {insight.insight}
              </p>
              {insight.recommendations && insight.recommendations.length > 0 && (
                <div className="mt-6 flex flex-wrap gap-2">
                  {insight.recommendations.map((rec, i) => (
                    <div key={i} className="bg-sidebar-accent/50 text-sidebar-accent-foreground text-sm px-4 py-2 rounded-md font-medium border border-sidebar-border">
                      {rec}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ) : null}

        {/* Core Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard 
            title="Total Volume" 
            value={metrics?.totalScreenings} 
            subtitle="last 30 days"
            icon={<Database className="w-5 h-5 text-blue-500" />}
            loading={metricsLoading}
            trend={{ value: 12, positive: true }}
          />
          <MetricCard 
            title="Avg Turnaround" 
            value={metrics?.avgTurnaroundByType ? `${Math.round(Object.values(metrics.avgTurnaroundByType as Record<string, number>).reduce((a,b)=>a+b, 0) / 4)} hrs` : "-"} 
            subtitle="across all check types"
            icon={<Clock className="w-5 h-5 text-primary" />}
            loading={metricsLoading}
            trend={{ value: 5, positive: false }}
          />
          <MetricCard 
            title="Dispute Rate" 
            value={metrics ? `${(metrics.disputeRate * 100).toFixed(1)}%` : "-"} 
            subtitle="industry avg: 2.1%"
            icon={<Scale className="w-5 h-5 text-amber-500" />}
            loading={metricsLoading}
            trend={{ value: 0.2, positive: false }}
          />
          <MetricCard 
            title="Adverse Action Rate" 
            value={metrics ? `${(metrics.adverseActionRate * 100).toFixed(1)}%` : "-"} 
            subtitle="of all screenings"
            icon={<ShieldCheck className="w-5 h-5 text-red-500" />}
            loading={metricsLoading}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Main Chart */}
          <Card className="shadow-sm border-border">
            <CardHeader className="border-b bg-muted/20">
              <CardTitle>Screening Volume & Efficacy</CardTitle>
              <CardDescription>Daily completed screenings vs initiated adverse actions.</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {timeSeriesLoading ? (
                <div className="h-[300px] w-full flex items-center justify-center">
                  <Skeleton className="w-full h-full" />
                </div>
              ) : (
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={timeSeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorScreenings" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorAdverse" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={formatChartDate} 
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
                        labelFormatter={formatChartDate}
                      />
                      <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                      <Area 
                        type="monotone" 
                        dataKey="screenings" 
                        name="Completed Screens"
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#colorScreenings)" 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="adverseActions" 
                        name="Adverse Actions"
                        stroke="hsl(var(--destructive))" 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#colorAdverse)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Turnaround times chart */}
          <Card className="shadow-sm border-border">
            <CardHeader className="border-b bg-muted/20">
              <CardTitle>Turnaround Times by Provider</CardTitle>
              <CardDescription>Average processing hours vs SLA SLA.</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {metricsLoading ? (
                <div className="h-[300px] w-full flex items-center justify-center">
                  <Skeleton className="w-full h-full" />
                </div>
              ) : (
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={[
                        { name: 'Criminal', value: (metrics?.avgTurnaroundByType as any)?.criminal || 0, sla: 24 },
                        { name: 'Employment', value: (metrics?.avgTurnaroundByType as any)?.employment || 0, sla: 72 },
                        { name: 'Education', value: (metrics?.avgTurnaroundByType as any)?.education || 0, sla: 48 },
                        { name: 'Driving', value: (metrics?.avgTurnaroundByType as any)?.driving || 0, sla: 12 },
                      ]}
                      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                      layout="vertical"
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="hsl(var(--border))" />
                      <XAxis type="number" hide />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12, fontWeight: 500 }}
                        width={80}
                      />
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: 'var(--radius)' }}
                        formatter={(value: number) => [`${value} hours`, 'Avg Turnaround']}
                      />
                      <Bar 
                        dataKey="value" 
                        name="Turnaround (hrs)" 
                        fill="hsl(var(--primary))" 
                        radius={[0, 4, 4, 0]}
                        barSize={24}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Benchmarks Section */}
        <Card className="shadow-sm border-border">
          <CardHeader className="border-b bg-muted/20 pb-4">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" /> Industry Benchmarks
                </CardTitle>
                <CardDescription className="mt-1">Turnaround time comparison vs. platform averages.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {benchmarksLoading ? (
              <div className="p-6 space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : benchmarks && benchmarks.length > 0 ? (
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-muted/40 uppercase text-xs font-semibold text-muted-foreground">
                  <tr>
                    <th className="px-6 py-4">Check Type</th>
                    <th className="px-6 py-4 text-right">Our Turnaround</th>
                    <th className="px-6 py-4 text-right">Industry Avg</th>
                    <th className="px-6 py-4 text-right">Delta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {benchmarks.map((item) => {
                    const isFaster = item.turnaroundDeltaPct < 0;
                    return (
                      <tr key={item.checkType} className="hover:bg-muted/20 transition-colors">
                        <td className="px-6 py-4 font-medium capitalize">{item.checkType.replace('_', ' ')}</td>
                        <td className="px-6 py-4 text-right">{item.ourAvgTurnaroundMs / 3600000} hrs</td>
                        <td className="px-6 py-4 text-right text-muted-foreground">{item.industryAvgTurnaroundMs / 3600000} hrs</td>
                        <td className="px-6 py-4 text-right">
                          <span className={`inline-flex items-center justify-end font-semibold ${isFaster ? 'text-green-600' : 'text-red-600'}`}>
                            {isFaster ? <TrendingDown size={14} className="mr-1" /> : <TrendingUp size={14} className="mr-1" />}
                            {Math.abs(item.turnaroundDeltaPct).toFixed(1)}% {isFaster ? 'faster' : 'slower'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-muted-foreground flex flex-col items-center">
                <Activity className="w-10 h-10 mb-2 opacity-20" />
                <p>Benchmark data not currently available.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

function Badge({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary text-primary-foreground ${className}`}>
      {children}
    </span>
  );
}

function MetricCard({ title, value, icon, loading, subtitle, trend }: { 
  title: string, 
  value?: string | number, 
  icon: React.ReactNode, 
  loading: boolean, 
  subtitle: string,
  trend?: { value: number, positive: boolean }
}) {
  return (
    <Card className="shadow-sm border-border">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="p-2.5 bg-muted rounded-xl">
            {icon}
          </div>
          {trend && (
            <div className={`flex items-center gap-1 text-xs font-bold ${trend.positive ? 'text-green-600' : 'text-red-600'}`}>
              {trend.positive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              {trend.value}%
            </div>
          )}
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
