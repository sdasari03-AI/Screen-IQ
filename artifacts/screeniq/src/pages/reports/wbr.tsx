import { useGetWbrReport, useGenerateWbrReport, getGetWbrReportQueryKey } from "@workspace/api-client-react";
import { AppLayout } from "@/components/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Sparkles, Calendar, ArrowRight, AlertTriangle, Lightbulb } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";

export default function WBRReport() {
  const queryClient = useQueryClient();

  const { data: report, isLoading: reportLoading } = useGetWbrReport({
    query: { queryKey: getGetWbrReportQueryKey() }
  });

  const generateReport = useGenerateWbrReport({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetWbrReportQueryKey() });
      }
    }
  });

  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    try {
      return format(parseISO(dateString), "MMMM d, yyyy");
    } catch {
      return dateString;
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 pb-12 max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
              <FileText className="text-primary" /> AI Weekly Business Review
            </h1>
            <p className="text-muted-foreground mt-1">Executive narrative report on platform health and screening operations.</p>
          </div>
          
          <Button 
            onClick={() => generateReport.mutate()} 
            disabled={generateReport.isPending}
            className="gap-2 shadow-sm font-semibold"
          >
            <Sparkles size={16} />
            {generateReport.isPending ? "Analyzing Data..." : "Generate Fresh Report"}
          </Button>
        </div>

        {reportLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-32 w-full rounded-xl" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Skeleton className="h-48 md:col-span-2 rounded-xl" />
              <Skeleton className="h-48 rounded-xl" />
            </div>
            <Skeleton className="h-96 w-full rounded-xl" />
          </div>
        ) : !report ? (
          <Card className="text-center py-16 border-dashed border-2">
            <CardContent className="flex flex-col items-center justify-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <FileText className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <h3 className="text-xl font-bold mb-2">No WBR Generated Yet</h3>
              <p className="text-muted-foreground max-w-md mx-auto mb-6">
                Generate your first AI-powered Weekly Business Review to get a narrative summary of screening performance, risks, and recommendations.
              </p>
              <Button onClick={() => generateReport.mutate()} disabled={generateReport.isPending} size="lg">
                <Sparkles className="w-4 h-4 mr-2" /> Generate Report
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="bg-primary/5 border-primary/20 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <Sparkles size={120} />
              </div>
              <CardContent className="p-6 relative z-10">
                <div className="flex items-center gap-2 text-sm font-semibold text-primary uppercase tracking-wider mb-2">
                  <Calendar size={16} /> 
                  Week of {formatDate(report.weekStart)} - {formatDate(report.weekEnd)}
                </div>
                <h2 className="text-2xl font-bold mb-3">Executive Summary</h2>
                <p className="text-lg leading-relaxed text-foreground/90 font-medium">
                  {report.summary}
                </p>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <Card className="shadow-sm">
                  <CardHeader className="border-b bg-muted/20">
                    <CardTitle>Business Narrative</CardTitle>
                  </CardHeader>
                  <CardContent className="p-8">
                    {/* A simple Markdown renderer using prose styles */}
                    <div 
                      className="prose prose-slate dark:prose-invert max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-a:text-primary"
                      dangerouslySetInnerHTML={{ __html: report.content.replace(/\n/g, '<br/>') }}
                    />
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                {report.keyMetrics && (
                  <Card className="shadow-sm">
                    <CardHeader className="border-b bg-muted/20 py-4">
                      <CardTitle className="text-base">Key Metrics</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 space-y-4">
                      {Object.entries(report.keyMetrics).map(([key, val]) => {
                        const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                        return (
                          <div key={key} className="flex justify-between items-center border-b border-border/50 last:border-0 pb-3 last:pb-0">
                            <span className="text-sm text-muted-foreground">{formattedKey}</span>
                            <span className="font-bold text-sm bg-muted px-2 py-1 rounded-md">{String(val)}</span>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                )}

                {report.risks && report.risks.length > 0 && (
                  <Card className="shadow-sm border-red-200 dark:border-red-900/50">
                    <CardHeader className="border-b border-red-100 dark:border-red-900/30 bg-red-50/50 dark:bg-red-950/20 py-4">
                      <CardTitle className="text-base flex items-center gap-2 text-red-700 dark:text-red-400">
                        <AlertTriangle size={18} /> Identified Risks
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                      <ul className="space-y-3">
                        {report.risks.map((risk, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <div className="min-w-[6px] h-[6px] rounded-full bg-red-500 mt-1.5" />
                            <span className="leading-snug">{risk}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {report.recommendations && report.recommendations.length > 0 && (
                  <Card className="shadow-sm border-blue-200 dark:border-blue-900/50">
                    <CardHeader className="border-b border-blue-100 dark:border-blue-900/30 bg-blue-50/50 dark:bg-blue-950/20 py-4">
                      <CardTitle className="text-base flex items-center gap-2 text-blue-700 dark:text-blue-400">
                        <Lightbulb size={18} /> Strategic Recommendations
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                      <ul className="space-y-3">
                        {report.recommendations.map((rec, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <ArrowRight size={14} className="text-blue-500 mt-0.5 shrink-0" />
                            <span className="leading-snug font-medium text-foreground/90">{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {report.generatedAt && (
                  <div className="text-xs text-center text-muted-foreground">
                    Report generated on {formatDate(report.generatedAt)}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}