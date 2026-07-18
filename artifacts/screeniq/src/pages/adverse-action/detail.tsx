import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useGetCandidate, useGetAdverseAction, useListAdverseActionNotices, useGenerateAdverseActionNotice, useUpdateAdverseAction } from "@workspace/api-client-react";
import { getGetAdverseActionQueryKey, getListAdverseActionNoticesQueryKey } from "@workspace/api-client-react";
import { AppLayout } from "@/components/app-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Clock, ShieldAlert, CheckCircle2, FileText, Send, Mail, AlertTriangle, User } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";

export default function AdverseActionDetail({ params }: { params: { id: string } }) {
  const candidateId = Number(params.id);
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [isReviewNoticeOpen, setIsReviewNoticeOpen] = useState(false);
  const [noticeTypeToGenerate, setNoticeTypeToGenerate] = useState<'pre_adverse' | 'final_adverse' | null>(null);

  const { data: candidate, isLoading: candidateLoading } = useGetCandidate(candidateId, { 
    query: { enabled: !!candidateId } 
  });

  const { data: adverseAction, isLoading: aaLoading } = useGetAdverseAction(candidateId, {
    query: { enabled: !!candidateId, queryKey: getGetAdverseActionQueryKey(candidateId) }
  });

  const { data: notices, isLoading: noticesLoading } = useListAdverseActionNotices(candidateId, {
    query: { enabled: !!candidateId, queryKey: getListAdverseActionNoticesQueryKey(candidateId) }
  });

  const generateNotice = useGenerateAdverseActionNotice({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAdverseActionNoticesQueryKey(candidateId) });
        queryClient.invalidateQueries({ queryKey: getGetAdverseActionQueryKey(candidateId) });
        setIsReviewNoticeOpen(false);
      }
    }
  });

  const updateAdverseAction = useUpdateAdverseAction({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetAdverseActionQueryKey(candidateId) });
      }
    }
  });

  const handleGenerateNotice = (type: 'pre_adverse' | 'final_adverse') => {
    setNoticeTypeToGenerate(type);
    setIsReviewNoticeOpen(true);
  };

  const confirmSendNotice = () => {
    if (noticeTypeToGenerate) {
      generateNotice.mutate({ 
        candidateId, 
        data: { noticeType: noticeTypeToGenerate } 
      });
    }
  };

  const advanceStage = (nextStage: 'waiting_period' | 'final_adverse' | 'closed') => {
    updateAdverseAction.mutate({
      candidateId,
      data: { stage: nextStage }
    });
  };

  if (candidateLoading || aaLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-32 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!adverseAction) {
    // Ideally redirect or show creation UI
    return (
      <AppLayout>
        <div className="text-center py-12">
          <ShieldAlert className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-bold">No Active Workflow</h2>
          <p className="text-muted-foreground mb-6">This candidate does not have an active adverse action workflow.</p>
          <Button asChild><Link href={`/candidates/${candidateId}`}>Back to Candidate</Link></Button>
        </div>
      </AppLayout>
    );
  }

  const preAdverseNotice = notices?.find(n => n.noticeType === 'pre_adverse');
  const finalNotice = notices?.find(n => n.noticeType === 'final_adverse');

  const daysWaiting = adverseAction.preAdverseNoticeSentAt 
    ? differenceInDays(new Date(), new Date(adverseAction.preAdverseNoticeSentAt))
    : 0;
  
  const waitingPeriodPassed = daysWaiting >= 7;

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 pb-12">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between">
          <div>
            <Link href="/adverse-action" className="text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2">
              <ArrowLeft size={16} /> Back to Workflows
            </Link>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">FCRA Adverse Action</h1>
              <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                {candidate?.name}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1 font-medium text-sm">
              Workflow ID: {adverseAction.id} • Initiated: {format(new Date(adverseAction.createdAt), "MMM d, yyyy")}
            </p>
          </div>
        </div>

        {/* Status Tracker */}
        <Card className="border-border shadow-sm overflow-hidden">
          <div className="flex flex-col md:flex-row">
            <StageStep 
              num={1} 
              title="Pre-Adverse Notice" 
              active={adverseAction.stage === 'pre_adverse'} 
              completed={['waiting_period', 'final_adverse', 'closed'].includes(adverseAction.stage)} 
            />
            <StageStep 
              num={2} 
              title="7-Day Waiting Period" 
              active={adverseAction.stage === 'waiting_period'} 
              completed={['final_adverse', 'closed'].includes(adverseAction.stage)} 
              meta={adverseAction.stage === 'waiting_period' ? `Day ${daysWaiting} of 7` : undefined}
            />
            <StageStep 
              num={3} 
              title="Final Notice" 
              active={adverseAction.stage === 'final_adverse'} 
              completed={adverseAction.stage === 'closed'} 
            />
            <StageStep 
              num={4} 
              title="Closed" 
              active={adverseAction.stage === 'closed'} 
              completed={adverseAction.stage === 'closed'} 
              isLast
            />
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Action Area */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Context Card */}
            <Card className="shadow-sm border-l-4 border-l-orange-500">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-orange-100 text-orange-600 rounded-md shrink-0">
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-2">Reason for Action</h3>
                    <p className="text-muted-foreground bg-muted/30 p-4 rounded-md font-medium">
                      {adverseAction.reason || "No reason specified."}
                    </p>
                    <div className="mt-4 flex gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/candidates/${candidateId}`}><User className="w-4 h-4 mr-2"/>View Full Report</Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Current Stage Action */}
            <Card className="shadow-sm border-primary/20">
              <CardHeader className="bg-primary/5 border-b border-primary/10">
                <CardTitle className="text-primary flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5" />
                  Action Required
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {adverseAction.stage === 'pre_adverse' && (
                  <div className="space-y-4">
                    <h3 className="font-bold text-lg">Send Pre-Adverse Action Notice</h3>
                    <p className="text-muted-foreground">
                      Before taking any adverse action, the FCRA requires you to provide the candidate with a pre-adverse action notice, a copy of the background report, and A Summary of Your Rights Under the FCRA.
                    </p>
                    
                    {preAdverseNotice ? (
                      <div className="bg-green-50 text-green-800 p-4 rounded-md border border-green-200 flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 mt-0.5 text-green-600" />
                        <div>
                          <p className="font-semibold">Notice Generated & Sent</p>
                          <p className="text-sm mt-1">Sent on {preAdverseNotice.sentAt ? format(new Date(preAdverseNotice.sentAt), "MMM d, yyyy h:mm a") : 'Unknown'}</p>
                          <Button className="mt-4" onClick={() => advanceStage('waiting_period')} disabled={updateAdverseAction.isPending}>
                            Start Waiting Period
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button onClick={() => handleGenerateNotice('pre_adverse')} className="mt-2 font-semibold">
                        <FileText className="w-4 h-4 mr-2" /> Generate Notice Draft
                      </Button>
                    )}
                  </div>
                )}

                {adverseAction.stage === 'waiting_period' && (
                  <div className="space-y-4">
                    <h3 className="font-bold text-lg">7-Day Waiting Period</h3>
                    <p className="text-muted-foreground">
                      You must wait a reasonable amount of time (typically 7 days) before taking final adverse action to allow the candidate to dispute the findings.
                    </p>
                    
                    <div className="flex items-center gap-4 mt-4">
                      <div className={`text-4xl font-extrabold ${waitingPeriodPassed ? 'text-green-500' : 'text-amber-500'}`}>
                        {daysWaiting}
                      </div>
                      <div className="text-sm font-semibold uppercase tracking-wider text-muted-foreground leading-tight">
                        Days<br/>Elapsed
                      </div>
                    </div>

                    <div className="pt-4 border-t mt-4">
                      <Button 
                        onClick={() => advanceStage('final_adverse')} 
                        disabled={!waitingPeriodPassed || updateAdverseAction.isPending}
                        variant={waitingPeriodPassed ? "default" : "secondary"}
                      >
                        Proceed to Final Action
                      </Button>
                      {!waitingPeriodPassed && (
                        <p className="text-xs text-amber-600 mt-2 font-medium flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Waiting period has not completed yet.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {adverseAction.stage === 'final_adverse' && (
                  <div className="space-y-4">
                    <h3 className="font-bold text-lg">Send Final Adverse Action Notice</h3>
                    <p className="text-muted-foreground">
                      The waiting period has passed. If you have decided not to hire the candidate based on the report, you must send a final notice.
                    </p>
                    
                    {finalNotice ? (
                      <div className="bg-green-50 text-green-800 p-4 rounded-md border border-green-200 flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 mt-0.5 text-green-600" />
                        <div>
                          <p className="font-semibold">Final Notice Sent</p>
                          <p className="text-sm mt-1">Sent on {finalNotice.sentAt ? format(new Date(finalNotice.sentAt), "MMM d, yyyy h:mm a") : 'Unknown'}</p>
                          <Button className="mt-4" onClick={() => advanceStage('closed')} disabled={updateAdverseAction.isPending}>
                            Close Workflow
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button onClick={() => handleGenerateNotice('final_adverse')} className="mt-2 font-semibold">
                        <FileText className="w-4 h-4 mr-2" /> Generate Final Notice
                      </Button>
                    )}
                  </div>
                )}

                {adverseAction.stage === 'closed' && (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h3 className="font-bold text-xl">Workflow Complete</h3>
                    <p className="text-muted-foreground mt-2 max-w-md">
                      The adverse action process has been completed successfully in compliance with FCRA requirements. All notices have been logged.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Document History */}
          <div className="space-y-6">
            <Card className="shadow-sm">
              <CardHeader className="bg-muted/20 border-b pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" /> Document Log
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {noticesLoading ? (
                  <div className="p-6 space-y-4">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : notices && notices.length > 0 ? (
                  <div className="divide-y text-sm">
                    {notices.map(notice => (
                      <div key={notice.id} className="p-4 flex gap-3 hover:bg-muted/30 transition-colors">
                        <div className="mt-0.5 text-primary">
                          <Mail className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-foreground capitalize">
                            {notice.noticeType.replace('_', ' ')}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {notice.sentAt ? format(new Date(notice.sentAt), "MMM d, yyyy h:mm a") : 'Draft'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center text-muted-foreground text-sm">
                    No documents generated yet.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Dialog for Reviewing and Sending Notice */}
        <Dialog open={isReviewNoticeOpen} onOpenChange={setIsReviewNoticeOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Review {noticeTypeToGenerate === 'pre_adverse' ? 'Pre-Adverse' : 'Final'} Notice</DialogTitle>
              <DialogDescription>
                Review the AI-generated notice text. Sending this will deliver an email to the candidate and log the action.
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 min-h-[40vh] py-4">
              <div className="border rounded-md bg-muted/10 p-4 h-full">
                <ScrollArea className="h-[400px]">
                  <div className="space-y-4 text-sm font-mono whitespace-pre-wrap p-2 text-foreground/80">
                    <p><strong>To:</strong> {candidate?.email}</p>
                    <p><strong>Subject:</strong> {noticeTypeToGenerate === 'pre_adverse' ? 'Pre-Adverse Action Notice' : 'Final Adverse Action Notice'} regarding your application</p>
                    <hr className="my-4 border-dashed border-border" />
                    <p>Dear {candidate?.name},</p>
                    
                    {noticeTypeToGenerate === 'pre_adverse' ? (
                      <p>
                        This letter is to inform you that we are considering denying your application for employment based in whole or in part on information obtained in a consumer report.
                        <br/><br/>
                        Enclosed please find:
                        <br/>1. A copy of your consumer report
                        <br/>2. A Summary of Your Rights Under the Fair Credit Reporting Act
                        <br/><br/>
                        You have the right to dispute the accuracy or completeness of any information in the report. If you wish to dispute, you may access your candidate portal or contact us within the next 7 days.
                      </p>
                    ) : (
                      <p>
                        We are writing to inform you that we will not be offering you employment. This decision was based in whole or in part on information obtained in a consumer report.
                        <br/><br/>
                        The consumer reporting agency that provided the report did not make the decision to take the adverse action and is unable to provide the specific reasons why the adverse action was taken.
                        <br/><br/>
                        You have the right to obtain a free copy of the report from the reporting agency within 60 days. You also have the right to dispute the accuracy or completeness of the information in the report directly with the reporting agency.
                      </p>
                    )}
                    <br/><br/>
                    <p>Sincerely,</p>
                    <p>ScreenIQ Compliance Team</p>
                  </div>
                </ScrollArea>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsReviewNoticeOpen(false)}>Cancel</Button>
              <Button onClick={confirmSendNotice} disabled={generateNotice.isPending} className="gap-2">
                <Send className="w-4 h-4" />
                {generateNotice.isPending ? "Sending..." : "Send to Candidate"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}

function StageStep({ num, title, active, completed, meta, isLast = false }: { num: number, title: string, active: boolean, completed: boolean, meta?: string, isLast?: boolean }) {
  const stateClass = active 
    ? "bg-primary text-primary-foreground border-primary" 
    : completed 
      ? "bg-muted text-foreground border-muted-foreground/30" 
      : "bg-transparent text-muted-foreground border-muted-foreground/20";
  
  return (
    <div className={`relative flex-1 flex flex-col p-6 ${!isLast ? 'border-b md:border-b-0 md:border-r border-border/50' : ''} ${active ? 'bg-primary/5' : ''}`}>
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-sm transition-colors ${stateClass}`}>
          {completed && !active ? <CheckCircle2 className="w-4 h-4" /> : num}
        </div>
        <span className={`font-bold ${active ? 'text-primary' : completed ? 'text-foreground' : 'text-muted-foreground'}`}>
          {title}
        </span>
      </div>
      {meta && (
        <span className="text-sm font-semibold text-primary uppercase tracking-wider ml-11">{meta}</span>
      )}
    </div>
  );
}
