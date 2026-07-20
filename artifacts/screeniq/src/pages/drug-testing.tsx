import { useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, AlertTriangle, Clock, FlaskConical, MapPin, ShieldAlert, FileText } from "lucide-react";
import { format } from "date-fns";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function useDrugTests() {
  return useQuery({ queryKey: ["drug-tests"], queryFn: () => fetch(`${BASE}/api/drug-tests`).then(r => r.json()) });
}
function useCandidates() {
  return useQuery({ queryKey: ["candidates-list"], queryFn: () => fetch(`${BASE}/api/candidates`).then(r => r.json()) });
}

const TEST_TYPE_OPTIONS = [
  { value: "5_panel_urine",  label: "5-Panel Urine (Standard non-DOT)" },
  { value: "10_panel_urine", label: "10-Panel Urine (Extended)" },
  { value: "dot_5_panel",    label: "DOT 5-Panel (Federally Regulated)" },
  { value: "hair_follicle",  label: "Hair Follicle (90-Day Window)" },
  { value: "oral_fluid",     label: "Oral Fluid (Recent Use)" },
];

const RESULT_CONFIG: Record<string, { label: string; color: string; icon: JSX.Element }> = {
  negative:        { label: "Negative",         color: "bg-green-100 text-green-700 border-green-200",  icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  positive:        { label: "Positive",         color: "bg-red-100 text-red-700 border-red-200",        icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  dilute:          { label: "Dilute",           color: "bg-amber-100 text-amber-700 border-amber-200",  icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  refused:         { label: "Refused",          color: "bg-red-100 text-red-700 border-red-200",        icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  invalid:         { label: "Invalid",          color: "bg-slate-100 text-slate-700 border-slate-200",  icon: <Clock className="w-3.5 h-3.5" /> },
  cancelled:       { label: "Cancelled",        color: "bg-slate-100 text-slate-700 border-slate-200",  icon: <Clock className="w-3.5 h-3.5" /> },
  pending_mro:     { label: "Pending MRO Review", color: "bg-violet-100 text-violet-700 border-violet-200", icon: <Clock className="w-3.5 h-3.5" /> },
  resulted:        { label: "Resulted",         color: "bg-blue-100 text-blue-700 border-blue-200",    icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
};

function ResultBadge({ status, result }: { status: string; result?: string }) {
  const key = status === "pending_mro" ? "pending_mro" : (result || status);
  const cfg = RESULT_CONFIG[key] || RESULT_CONFIG.resulted;
  return (
    <Badge variant="outline" className={`gap-1 text-xs ${cfg.color}`}>
      {cfg.icon} {cfg.label}
    </Badge>
  );
}

export default function DrugTesting() {
  const { data: tests, isLoading } = useDrugTests();
  const { data: candidatesData } = useCandidates();
  const queryClient = useQueryClient();
  const [selectedCandidate, setSelectedCandidate] = useState("");
  const [selectedTestType, setSelectedTestType] = useState("");
  const [showOrder, setShowOrder] = useState(false);

  const candidates = candidatesData?.candidates || candidatesData || [];

  const orderTest = useMutation({
    mutationFn: (body: { candidateId: number; testType: string }) =>
      fetch(`${BASE}/api/drug-tests/order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drug-tests"] });
      setShowOrder(false);
      setSelectedCandidate("");
      setSelectedTestType("");
    },
  });

  const completeMRO = useMutation({
    mutationFn: (testId: number) =>
      fetch(`${BASE}/api/drug-tests/${testId}/mro-complete`, { method: "POST" }).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["drug-tests"] }),
  });

  const stats = {
    total: (tests || []).length,
    negative: (tests || []).filter((t: any) => t.result === "negative").length,
    positive: (tests || []).filter((t: any) => t.result === "positive").length,
    pendingMRO: (tests || []).filter((t: any) => t.status === "pending_mro").length,
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 pb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Drug Testing</h1>
            <p className="text-muted-foreground mt-1">
              5 test types · DOT compliance · MRO review workflow · Chain of custody tracking
            </p>
          </div>
          <Button onClick={() => setShowOrder(v => !v)} className="shrink-0">
            <FlaskConical className="w-4 h-4 mr-2" /> Order Drug Test
          </Button>
        </div>

        {/* Order form */}
        {showOrder && (
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Order a New Drug Test</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Candidate</label>
                <Select value={selectedCandidate} onValueChange={setSelectedCandidate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select candidate..." />
                  </SelectTrigger>
                  <SelectContent>
                    {candidates.map((c: any) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name} — {c.position}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Test Type</label>
                <Select value={selectedTestType} onValueChange={setSelectedTestType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select test type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {TEST_TYPE_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                disabled={!selectedCandidate || !selectedTestType || orderTest.isPending}
                onClick={() => orderTest.mutate({ candidateId: Number(selectedCandidate), testType: selectedTestType })}
              >
                {orderTest.isPending ? "Ordering..." : "Place Order"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Tests", value: stats.total, icon: <FlaskConical className="w-5 h-5 text-blue-500" />, bg: "bg-blue-50" },
            { label: "Negative",    value: stats.negative, icon: <CheckCircle2 className="w-5 h-5 text-green-500" />, bg: "bg-green-50" },
            { label: "Positive",    value: stats.positive, icon: <AlertTriangle className="w-5 h-5 text-red-500" />, bg: "bg-red-50" },
            { label: "Pending MRO", value: stats.pendingMRO, icon: <Clock className="w-5 h-5 text-violet-500" />, bg: "bg-violet-50" },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="p-5 flex items-start gap-4">
                <div className={`p-2 rounded-lg ${s.bg}`}>{s.icon}</div>
                <div>
                  <p className="text-2xl font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Test List */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold">All Drug Tests</h2>
          {isLoading ? (
            <div className="space-y-3">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-36" />)}</div>
          ) : (tests || []).length === 0 ? (
            <div className="text-center py-16 text-muted-foreground border rounded-xl">
              <FlaskConical className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No drug tests ordered yet</p>
              <p className="text-sm mt-1">Click "Order Drug Test" to begin</p>
            </div>
          ) : (
            (tests || []).map((test: any) => (
              <Card key={test.id} className={test.status === "pending_mro" ? "border-violet-200" : ""}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap mb-2">
                        <span className="font-bold text-sm">{test.candidateName}</span>
                        <ResultBadge status={test.status} result={test.result} />
                        {test.dotRegulated && (
                          <Badge variant="outline" className="text-[10px] gap-1 bg-blue-50 text-blue-700 border-blue-200">
                            <ShieldAlert className="w-3 h-3" /> DOT Regulated
                          </Badge>
                        )}
                      </div>

                      <p className="text-sm text-muted-foreground mb-3">{test.testTypeLabel}</p>

                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {(test.panels || []).map((panel: string) => (
                          <span key={panel} className="text-[10px] bg-muted px-2 py-0.5 rounded font-mono">{panel}</span>
                        ))}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-muted-foreground">
                        <div>
                          <p className="font-semibold text-foreground mb-0.5">Chain of Custody</p>
                          <p className="font-mono">{test.chainOfCustodyId || "—"}</p>
                        </div>
                        <div>
                          <p className="font-semibold text-foreground mb-0.5">Ordered</p>
                          <p>{test.orderedAt ? format(new Date(test.orderedAt), "MMM d, yyyy") : "—"}</p>
                        </div>
                        <div>
                          <p className="font-semibold text-foreground mb-0.5">Resulted</p>
                          <p>{test.resultedAt ? format(new Date(test.resultedAt), "MMM d, yyyy") : "Pending"}</p>
                        </div>
                        {test.collectionSite?.name && (
                          <div>
                            <p className="font-semibold text-foreground mb-0.5 flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> Collection Site
                            </p>
                            <p>{test.collectionSite.name}</p>
                          </div>
                        )}
                      </div>

                      {(test.dotComplianceFlags || []).length > 0 && (
                        <div className="mt-3 space-y-1.5">
                          {test.dotComplianceFlags.map((flag: string, i: number) => (
                            <div key={i} className="flex items-start gap-2 text-xs bg-blue-50 text-blue-800 border border-blue-200 rounded-lg px-3 py-2">
                              <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                              {flag}
                            </div>
                          ))}
                        </div>
                      )}

                      {test.status === "pending_mro" && (
                        <div className="mt-3 pt-3 border-t flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm text-violet-700">
                            <Clock className="w-4 h-4" />
                            <span>Awaiting Medical Review Officer (MRO) sign-off</span>
                          </div>
                          <Button size="sm" variant="outline" className="text-xs border-violet-200 text-violet-700 hover:bg-violet-50"
                            onClick={() => completeMRO.mutate(test.id)}
                            disabled={completeMRO.isPending}>
                            <FileText className="w-3.5 h-3.5 mr-1.5" />
                            {completeMRO.isPending ? "Saving..." : "Mark MRO Complete"}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
}
