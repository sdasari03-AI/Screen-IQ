import { AppLayout } from "@/components/app-layout";
import { useGetBenchmarks, getGetBenchmarksQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { ArrowLeft, Target, TrendingDown, TrendingUp, Info } from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend, 
  ResponsiveContainer 
} from "recharts";

export default function Benchmarks() {
  const { data: benchmarks, isLoading: benchmarksLoading } = useGetBenchmarks({
    query: { queryKey: getGetBenchmarksQueryKey() }
  });

  const chartData = benchmarks?.map(b => ({
    name: b.checkType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
    ourTurnaround: Number((b.ourAvgTurnaroundMs / 3600000).toFixed(1)),
    industryTurnaround: Number((b.industryAvgTurnaroundMs / 3600000).toFixed(1)),
    delta: b.turnaroundDeltaPct,
  })) || [];

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 pb-12">
        <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between">
          <div>
            <Link href="/analytics" className="text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2">
              <ArrowLeft size={16} /> Back to Analytics
            </Link>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
              Industry Benchmarks
            </h1>
            <p className="text-muted-foreground mt-1">Compare platform performance against industry averages.</p>
          </div>
        </div>

        <Card className="shadow-sm border-border">
          <CardHeader className="border-b bg-muted/20">
            <CardTitle>Average Turnaround Time vs Industry (Hours)</CardTitle>
            <CardDescription>Lower turnaround times indicate faster screening completion.</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {benchmarksLoading ? (
              <div className="h-[400px] w-full flex items-center justify-center">
                <Skeleton className="w-full h-full" />
              </div>
            ) : chartData.length > 0 ? (
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 13 }}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: 'var(--radius)' }}
                      formatter={(value: number) => [`${value} hrs`, undefined]}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar dataKey="ourTurnaround" name="Our Turnaround" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="industryTurnaround" name="Industry Avg" fill="hsl(var(--muted-foreground))" opacity={0.5} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                No benchmark data available
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-6">
          <Card className="shadow-sm border-border">
            <CardHeader className="border-b bg-muted/20">
              <CardTitle>Detailed Competitive Analysis</CardTitle>
              <CardDescription>Breakdown of flag rates, dispute rates, and turnaround times.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {benchmarksLoading ? (
                <div className="p-6 space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : benchmarks && benchmarks.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-muted/40 uppercase text-xs font-semibold text-muted-foreground">
                      <tr>
                        <th className="px-6 py-4">Check Type</th>
                        <th className="px-6 py-4 text-center">Turnaround Delta</th>
                        <th className="px-6 py-4 text-center">Flag Rate (Us / Ind)</th>
                        <th className="px-6 py-4 text-center">Dispute Rate (Us / Ind)</th>
                        <th className="px-6 py-4">Source</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {benchmarks.map((item) => {
                        const isFaster = item.turnaroundDeltaPct < 0;
                        const ourFlag = (item.ourFlagRate * 100).toFixed(1);
                        const indFlag = (item.industryFlagRate * 100).toFixed(1);
                        const ourDisp = item.ourDisputeRate !== undefined ? (item.ourDisputeRate * 100).toFixed(1) : '-';
                        const indDisp = item.industryDisputeRate !== undefined ? (item.industryDisputeRate * 100).toFixed(1) : '-';

                        return (
                          <tr key={item.checkType} className="hover:bg-muted/20 transition-colors">
                            <td className="px-6 py-4 font-medium capitalize">{item.checkType.replace('_', ' ')}</td>
                            <td className="px-6 py-4 text-center">
                              <span className={`inline-flex items-center font-semibold px-2.5 py-1 rounded-full text-xs ${isFaster ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {isFaster ? <TrendingDown size={14} className="mr-1" /> : <TrendingUp size={14} className="mr-1" />}
                                {Math.abs(item.turnaroundDeltaPct).toFixed(1)}% {isFaster ? 'faster' : 'slower'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center font-mono text-xs">
                              {ourFlag}% <span className="text-muted-foreground mx-1">/</span> {indFlag}%
                            </td>
                            <td className="px-6 py-4 text-center font-mono text-xs">
                              {ourDisp}% <span className="text-muted-foreground mx-1">/</span> {indDisp}%
                            </td>
                            <td className="px-6 py-4 text-xs text-muted-foreground flex items-center gap-1">
                              <Info size={12} /> {item.source || 'Aggregated Data'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  No detailed benchmark data found.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}