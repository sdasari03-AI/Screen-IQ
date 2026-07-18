import { useState, useRef } from "react";
import { useParams, Link, useLocation } from "wouter";
import { 
  useGetCandidate, 
  useListScreeningRuns, 
  useGetRiskAssessment,
  useRunScreening,
  useGenerateRiskAssessment,
  useListCheckResults,
  useListCandidateDisputes,
  useUpdateDispute,
  useCreateAdverseAction
} from "@workspace/api-client-react";
import { getGetCandidateQueryKey, getListScreeningRunsQueryKey, getGetRiskAssessmentQueryKey, getListCheckResultsQueryKey, getListCandidateDisputesQueryKey, getGetAdverseActionQueryKey } from "@workspace/api-client-react";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Play, ShieldAlert, CheckCircle2, AlertTriangle, Clock, Search, FileText, User, Mail, Phone, Calendar, Hash, ExternalLink, Activity, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";

export default function CandidateDetail() {
  const { id } = useParams();
  const candidateId = Number(id);
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [isRunScreenOpen, setIsRunScreenOpen] = useState(false);
  const [isAdverseActionOpen, setIsAdverseActionOpen] = useState(false);
  const [adverseReason, setAdverseReason] = useState("");
  const [selectedChecks, setSelectedChecks] = useState<string[]>(['criminal', 'employment', 'education']);
  
  const [selectedDisputeId, setSelectedDisputeId] = useState<number | null>(null);
  const [resolutionText, setResolutionText] = useState("");
  const [resolutionStatus, setResolutionStatus] = useState<'resolved' | 'rejected'>('resolved');

  const { data: candidate, isLoading: candidateLoading } = useGetCandidate(candidateId, { 
    query: { enabled: !!candidateId, queryKey: getGetCandidateQueryKey(candidateId) } 
  });

  const { data: runs, isLoading: runsLoading } = useListScreeningRuns(candidateId, {
    query: { enabled: !!candidateId, queryKey: getListScreeningRunsQueryKey(candidateId) }
  });

  const latestRun = runs?.[0]; // Assuming API returns desc order

  const { data: checkResults, isLoading: checksLoading } = useListCheckResults(candidateId, latestRun?.id || 0, {
    query: { enabled: !!latestRun?.id, queryKey: getListCheckResultsQueryKey(candidateId, latestRun?.id || 0) }
  });

  const { data: disputes } = useListCandidateDisputes(candidateId, {
    query: { enabled: !!candidateId, queryKey: getListCandidateDisputesQueryKey(candidateId) }
  });

  const { data: riskAssessment, isLoading: riskLoading } = useGetRiskAssessment(candidateId, latestRun?.id || 0, {
    query: { 
      enabled: !!latestRun?.id && latestRun?.status === 'completed', 
      queryKey: getGetRiskAssessmentQueryKey(candidateId, latestRun?.id || 0),
      retry: false // May 404 if not generated yet
    }
  });

  const runScreening = useRunScreening({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListScreeningRunsQueryKey(candidateId) });
        queryClient.invalidateQueries({ queryKey: getGetCandidateQueryKey(candidateId) });
        setIsRunScreenOpen(false);
      }
    }
  });

  const generateRisk = useGenerateRiskAssessment({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetRiskAssessmentQueryKey(candidateId, latestRun?.id || 0) });
      }
    }
  });

  const createAdverseAction = useCreateAdverseAction({
    mutation: {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getGetCandidateQueryKey(candidateId) });
        queryClient.invalidateQueries({ queryKey: getGetAdverseActionQueryKey(candidateId) });
        setIsAdverseActionOpen(false);
        setLocation(`/adverse-action/${candidateId}`);
      }
    }
  });

  const updateDispute = useUpdateDispute({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCandidateDisputesQueryKey(candidateId) });
        setSelectedDisputeId(null);
        setResolutionText("");
      }
    }
  });

  const handleRunScreening = () => {
    runScreening.mutate({ 
      candidateId, 
      data: { checkTypes: selectedChecks } 
    });
  };

  const handleInitiateAdverseAction = () => {
    if (latestRun?.id) {
      createAdverseAction.mutate({
        candidateId,
        data: {
          screeningRunId: latestRun.id,
          reason: adverseReason || "Unfavorable background check findings."
        }
      });
    }
  };

  const handleResolveDispute = () => {
    if (selectedDisputeId) {
      updateDispute.mutate({
        disputeId: selectedDisputeId,
        data: {
          status: resolutionStatus,
          resolution: resolutionText
        }
      });
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'pending': return <Badge variant="outline" className="bg-muted text-muted-foreground"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      case 'in_progress': return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200"><div className="w-2 h-2 rounded-full bg-blue-500 mr-1.5 animate-pulse" /> Running</Badge>;
      case 'completed': return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle2 className="w-3 h-3 mr-1" /> Cleared</Badge>;
      case 'flagged': return <Badge variant="destructive" className="bg-red-50 text-red-700 border-red-200"><AlertTriangle className="w-3 h-3 mr-1" /> Flagged</Badge>;
      case 'adverse_action': return <Badge variant="destructive"><ShieldAlert className="w-3 h-3 mr-1" /> Adverse Action</Badge>;
      default: return null;
    }
  };

  const getCheckStatusIcon = (status: string) => {
    switch (status) {
      case 'clear':
      case 'clean':
      case 'confirmed': return <CheckCircle2 className="text-green-500" />;
      case 'flag':
      case 'violations':
      case 'discrepancy': return <AlertTriangle className="text-red-500" />;
      case 'review':
      case 'unverified': return <Clock className="text-amber-500" />;
      default: return <Activity className="text-muted-foreground" />;
    }
  };

  if (candidateLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-32" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-64 col-span-2" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!candidate) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <h2 className="text-xl font-bold">Candidate not found</h2>
          <Button asChild className="mt-4"><Link href="/candidates">Back to list</Link></Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 pb-12">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between">
          <div>
            <Link href="/candidates" className="text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2">
              <ArrowLeft size={16} /> Back to Candidates
            </Link>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{candidate.name}</h1>
              {getStatusBadge(candidate.status)}
            </div>
            <p className="text-muted-foreground mt-1">{candidate.position}</p>
          </div>

          <div className="flex gap-3">
            {candidate.status === 'flagged' && (
              <Dialog open={isAdverseActionOpen} onOpenChange={setIsAdverseActionOpen}>
                <DialogTrigger asChild>
                  <Button variant="destructive" className="font-semibold shadow-sm">
                    <ShieldAlert className="w-4 h-4 mr-2" /> Initiate Adverse Action
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Initiate FCRA Adverse Action</DialogTitle>
                    <DialogDescription>
                      Begin the formal adverse action process based on findings in the screening report. This will generate a pre-adverse notice.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="reason">Reason for Action (Internal Notes)</Label>
                      <Textarea 
                        id="reason"
                        placeholder="e.g., Unfavorable employment verification and MVR violations."
                        value={adverseReason}
                        onChange={(e) => setAdverseReason(e.target.value)}
                        className="min-h-[100px]"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAdverseActionOpen(false)}>Cancel</Button>
                    <Button onClick={handleInitiateAdverseAction} disabled={createAdverseAction.isPending} variant="destructive">
                      {createAdverseAction.isPending ? "Initiating..." : "Start Workflow"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
            
            <Dialog open={isRunScreenOpen} onOpenChange={setIsRunScreenOpen}>
              <DialogTrigger asChild>
                <Button className="font-semibold shadow-sm" disabled={candidate.status === 'in_progress'}>
                  <Play className="w-4 h-4 mr-2" /> 
                  {candidate.status === 'pending' ? 'Start Screening' : 'Rerun Screening'}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Configure Background Check</DialogTitle>
                  <DialogDescription>
                    Select the checks to perform for {candidate.name}. Cost will be calculated based on vendor sources.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="flex items-center space-x-2 p-3 border rounded-md bg-muted/20">
                    <Checkbox id="check-criminal" checked={selectedChecks.includes('criminal')} 
                      onCheckedChange={(checked) => {
                        setSelectedChecks(prev => checked ? [...prev, 'criminal'] : prev.filter(c => c !== 'criminal'))
                      }} 
                    />
                    <Label htmlFor="check-criminal" className="flex-1 cursor-pointer font-medium">National Criminal Database</Label>
                    <Badge variant="secondary">Instant</Badge>
                  </div>
                  <div className="flex items-center space-x-2 p-3 border rounded-md bg-muted/20">
                    <Checkbox id="check-employment" checked={selectedChecks.includes('employment')} 
                      onCheckedChange={(checked) => {
                        setSelectedChecks(prev => checked ? [...prev, 'employment'] : prev.filter(c => c !== 'employment'))
                      }} 
                    />
                    <Label htmlFor="check-employment" className="flex-1 cursor-pointer font-medium">Employment Verification</Label>
                    <Badge variant="secondary">1-3 Days</Badge>
                  </div>
                  <div className="flex items-center space-x-2 p-3 border rounded-md bg-muted/20">
                    <Checkbox id="check-education" checked={selectedChecks.includes('education')} 
                      onCheckedChange={(checked) => {
                        setSelectedChecks(prev => checked ? [...prev, 'education'] : prev.filter(c => c !== 'education'))
                      }} 
                    />
                    <Label htmlFor="check-education" className="flex-1 cursor-pointer font-medium">Education Verification</Label>
                    <Badge variant="secondary">1-2 Days</Badge>
                  </div>
                  <div className="flex items-center space-x-2 p-3 border rounded-md bg-muted/20">
                    <Checkbox id="check-driving" checked={selectedChecks.includes('driving')} 
                      onCheckedChange={(checked) => {
                        setSelectedChecks(prev => checked ? [...prev, 'driving'] : prev.filter(c => c !== 'driving'))
                      }} 
                    />
                    <Label htmlFor="check-driving" className="flex-1 cursor-pointer font-medium">Motor Vehicle Record</Label>
                    <Badge variant="secondary">Instant</Badge>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsRunScreenOpen(false)}>Cancel</Button>
                  <Button onClick={handleRunScreening} disabled={runScreening.isPending || selectedChecks.length === 0}>
                    {runScreening.isPending ? "Starting..." : "Run Selected Checks"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Risk Assessment Banner */}
            {riskAssessment && (
              <Card className={`border-2 ${
                riskAssessment.overallRisk === 'High' ? 'border-red-500 bg-red-50/50 dark:bg-red-950/20' : 
                riskAssessment.overallRisk === 'Medium' ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20' : 
                'border-green-500 bg-green-50/50 dark:bg-green-950/20'
              }`}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-full ${
                      riskAssessment.overallRisk === 'High' ? 'bg-red-100 text-red-600' : 
                      riskAssessment.overallRisk === 'Medium' ? 'bg-amber-100 text-amber-600' : 
                      'bg-green-100 text-green-600'
                    }`}>
                      {riskAssessment.overallRisk === 'High' ? <ShieldAlert className="w-8 h-8" /> : 
                       riskAssessment.overallRisk === 'Medium' ? <AlertTriangle className="w-8 h-8" /> : 
                       <CheckCircle2 className="w-8 h-8" />}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-1">
                        {riskAssessment.overallRisk} Risk Profile
                      </h3>
                      <p className="text-sm font-medium mb-3">{riskAssessment.keyFindings}</p>
                      
                      {riskAssessment.fcraAdverseFlag && (
                        <div className="bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 p-3 rounded-md text-sm flex items-center gap-2 mt-4 font-medium border border-red-200 dark:border-red-800">
                          <AlertTriangle size={16} className="shrink-0" />
                          <span>FCRA Adverse Action highly recommended based on findings.</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* If screening completed but no risk assessment yet */}
            {latestRun?.status === 'completed' && !riskAssessment && !riskLoading && (
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-6 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-lg text-primary">Screening Complete</h3>
                    <p className="text-muted-foreground text-sm">Generate an AI risk assessment to synthesize findings.</p>
                  </div>
                  <Button onClick={() => generateRisk.mutate(candidateId)} disabled={generateRisk.isPending}>
                    {generateRisk.isPending ? "Analyzing..." : "Generate AI Assessment"}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Screening Results Tabs */}
            <Card className="shadow-sm">
              <Tabs defaultValue="results" className="w-full">
                <div className="border-b px-6 py-4 flex items-center justify-between bg-muted/10">
                  <h3 className="font-bold text-lg">Screening Data</h3>
                  <TabsList className="bg-muted">
                    <TabsTrigger value="results">Check Results</TabsTrigger>
                    <TabsTrigger value="history">Run History</TabsTrigger>
                  </TabsList>
                </div>
                
                <TabsContent value="results" className="p-0 m-0">
                  {checksLoading || runsLoading ? (
                    <div className="p-8 space-y-4">
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-16 w-full" />
                    </div>
                  ) : !latestRun ? (
                    <div className="text-center p-12 text-muted-foreground">
                      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                        <Search className="w-8 h-8 text-muted-foreground/50" />
                      </div>
                      <p className="font-medium text-foreground">No screenings run yet</p>
                      <p className="text-sm mt-1">Initiate a screening run to see results here.</p>
                    </div>
                  ) : latestRun.status === 'running' ? (
                    <div className="text-center p-12">
                      <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                        <Activity className="w-8 h-8" />
                      </div>
                      <h3 className="font-bold text-lg mb-2">Screening in Progress</h3>
                      <div className="w-64 bg-muted h-2 rounded-full mx-auto overflow-hidden">
                        <div 
                          className="bg-primary h-full transition-all duration-1000 ease-out" 
                          style={{ width: `${(latestRun.checksCompleted / latestRun.checksTotal) * 100}%` }}
                        />
                      </div>
                      <p className="text-sm text-muted-foreground mt-3">
                        Completed {latestRun.checksCompleted} of {latestRun.checksTotal} checks
                      </p>
                    </div>
                  ) : checkResults?.length ? (
                    <div className="divide-y divide-border/50">
                      {checkResults.map((check) => {
                        const checkDispute = disputes?.find(d => d.checkResultId === check.id);
                        
                        return (
                          <div key={check.id} className="p-6 hover:bg-muted/10 transition-colors">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-4">
                                <div className="mt-1 bg-background rounded-full p-1 border shadow-sm">
                                  {getCheckStatusIcon(check.status)}
                                </div>
                                <div>
                                  <h4 className="font-bold text-base capitalize">{check.checkType} Check</h4>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="secondary" className="capitalize text-xs font-semibold">{check.statusLabel || check.status}</Badge>
                                    <span className="text-xs text-muted-foreground">• Source: {check.dataSource}</span>
                                  </div>
                                  
                                  {check.details && Object.keys(check.details).length > 0 && (
                                    <div className="mt-4 bg-muted/30 rounded-md p-3 text-sm font-mono whitespace-pre-wrap text-muted-foreground border">
                                      {JSON.stringify(check.details, null, 2)}
                                    </div>
                                  )}

                                  {checkDispute && (
                                    <div className="mt-4 bg-amber-50/50 border border-amber-200 rounded-md p-4">
                                      <div className="flex items-center justify-between mb-2">
                                        <h5 className="font-semibold text-amber-900 flex items-center gap-2 text-sm">
                                          <MessageSquare className="w-4 h-4" /> Candidate Dispute
                                        </h5>
                                        <Badge variant="outline" className={`
                                          ${checkDispute.status === 'resolved' ? 'bg-green-100 text-green-800 border-green-200' : 
                                            checkDispute.status === 'rejected' ? 'bg-red-100 text-red-800 border-red-200' : 
                                            'bg-amber-100 text-amber-800 border-amber-200'}
                                        `}>
                                          {checkDispute.status.replace('_', ' ')}
                                        </Badge>
                                      </div>
                                      <p className="text-sm text-amber-800/80 italic border-l-2 border-amber-300 pl-3 py-1 my-2">
                                        "{checkDispute.reason}"
                                      </p>
                                      
                                      {checkDispute.status === 'open' || checkDispute.status === 'under_review' ? (
                                        <div className="mt-3 pt-3 border-t border-amber-200/50">
                                          <Dialog open={selectedDisputeId === checkDispute.id} onOpenChange={(open) => {
                                            if (!open) setSelectedDisputeId(null);
                                            else setSelectedDisputeId(checkDispute.id);
                                          }}>
                                            <DialogTrigger asChild>
                                              <Button size="sm" variant="outline" className="bg-white hover:bg-amber-100 border-amber-300 text-amber-900">
                                                Resolve Dispute
                                              </Button>
                                            </DialogTrigger>
                                            <DialogContent>
                                              <DialogHeader>
                                                <DialogTitle>Resolve Candidate Dispute</DialogTitle>
                                                <DialogDescription>
                                                  Record the outcome of your investigation into this disputed finding.
                                                </DialogDescription>
                                              </DialogHeader>
                                              <div className="space-y-4 py-4">
                                                <div className="bg-muted/30 p-3 rounded-md text-sm italic border-l-2 border-primary mb-4">
                                                  "{checkDispute.reason}"
                                                </div>
                                                <div className="space-y-2">
                                                  <Label>Resolution Decision</Label>
                                                  <div className="flex gap-4 mt-2">
                                                    <Button 
                                                      type="button"
                                                      variant={resolutionStatus === 'resolved' ? 'default' : 'outline'}
                                                      className={resolutionStatus === 'resolved' ? 'bg-green-600 hover:bg-green-700 text-white' : ''}
                                                      onClick={() => setResolutionStatus('resolved')}
                                                    >
                                                      Record as Resolved
                                                    </Button>
                                                    <Button 
                                                      type="button"
                                                      variant={resolutionStatus === 'rejected' ? 'default' : 'outline'}
                                                      className={resolutionStatus === 'rejected' ? 'bg-red-600 hover:bg-red-700 text-white' : ''}
                                                      onClick={() => setResolutionStatus('rejected')}
                                                    >
                                                      Reject Dispute
                                                    </Button>
                                                  </div>
                                                </div>
                                                <div className="space-y-2 mt-4">
                                                  <Label htmlFor="resolution">Investigation Notes / Resolution</Label>
                                                  <Textarea 
                                                    id="resolution"
                                                    placeholder="Detail the findings of your investigation..."
                                                    value={resolutionText}
                                                    onChange={(e) => setResolutionText(e.target.value)}
                                                  />
                                                </div>
                                              </div>
                                              <DialogFooter>
                                                <Button variant="outline" onClick={() => setSelectedDisputeId(null)}>Cancel</Button>
                                                <Button onClick={handleResolveDispute} disabled={updateDispute.isPending || !resolutionText}>
                                                  {updateDispute.isPending ? "Saving..." : "Save Resolution"}
                                                </Button>
                                              </DialogFooter>
                                            </DialogContent>
                                          </Dialog>
                                        </div>
                                      ) : checkDispute.resolution ? (
                                        <div className="mt-3 text-sm border-t border-amber-200/50 pt-3">
                                          <span className="font-semibold block mb-1 text-amber-900">Resolution Notes:</span>
                                          <p className="text-amber-800">{checkDispute.resolution}</p>
                                        </div>
                                      ) : null}
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              <div className="text-right flex flex-col items-end">
                                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Confidence</span>
                                <div className={`text-lg font-bold ${check.confidenceScore < 0.8 ? 'text-amber-500' : 'text-green-500'}`}>
                                  {Math.round(check.confidenceScore * 100)}%
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center p-12 text-muted-foreground">
                      No check results available.
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="history" className="p-6 m-0">
                  <div className="space-y-4">
                    {runs?.map((run) => (
                      <div key={run.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">Run #{run.id}</span>
                            <Badge variant={run.status === 'completed' ? 'outline' : 'secondary'} className={run.status === 'completed' ? 'border-green-200 text-green-700 bg-green-50' : ''}>
                              {run.status}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {run.startedAt ? format(new Date(run.startedAt), "MMM d, yyyy h:mm a") : 'Pending'}
                          </div>
                        </div>
                        <div className="text-sm font-medium">
                          {run.checksCompleted} / {run.checksTotal} Checks
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </Card>
          </div>

          {/* Sidebar Area */}
          <div className="space-y-6">
            <Card className="shadow-sm">
              <CardHeader className="bg-muted/20 border-b pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" /> Profile Data
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y text-sm">
                  <div className="p-4 flex flex-col gap-1">
                    <span className="text-muted-foreground text-xs uppercase font-semibold tracking-wider">Email</span>
                    <span className="font-medium flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                      {candidate.email || 'Not provided'}
                    </span>
                  </div>
                  <div className="p-4 flex flex-col gap-1">
                    <span className="text-muted-foreground text-xs uppercase font-semibold tracking-wider">Phone</span>
                    <span className="font-medium flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                      {candidate.phone || 'Not provided'}
                    </span>
                  </div>
                  <div className="p-4 flex flex-col gap-1">
                    <span className="text-muted-foreground text-xs uppercase font-semibold tracking-wider">Date of Birth</span>
                    <span className="font-medium flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                      {candidate.dateOfBirth ? format(new Date(candidate.dateOfBirth), "MMM d, yyyy") : 'Not provided'}
                    </span>
                  </div>
                  <div className="p-4 flex flex-col gap-1">
                    <span className="text-muted-foreground text-xs uppercase font-semibold tracking-wider">SSN (Last 4)</span>
                    <span className="font-medium flex items-center gap-2">
                      <Hash className="w-3.5 h-3.5 text-muted-foreground" />
                      {candidate.ssnLastFour ? `***-**-${candidate.ssnLastFour}` : 'Not provided'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-primary/20 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <ExternalLink className="w-4 h-4" /> Candidate Portal
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-4">
                  Candidates have access to a secure portal to review findings and initiate disputes.
                </p>
                {candidate.portalToken ? (
                  <Button variant="outline" className="w-full bg-background" asChild>
                    <a href={`/portal/${candidate.portalToken}`} target="_blank" rel="noreferrer">
                      View Portal as Candidate
                    </a>
                  </Button>
                ) : (
                  <Button variant="secondary" className="w-full" disabled>
                    Portal not active
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
