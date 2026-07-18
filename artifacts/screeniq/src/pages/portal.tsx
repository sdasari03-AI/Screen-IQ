import { useState } from "react";
import { useParams, Link } from "wouter";
import { useGetCandidatePortal, useCreateDispute } from "@workspace/api-client-react";
import { getGetCandidatePortalQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ShieldCheck, Clock, CheckCircle2, AlertTriangle, FileText, Lock, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";

export default function CandidatePortal() {
  const { token } = useParams();
  const queryClient = useQueryClient();
  const [disputeCheckId, setDisputeCheckId] = useState<number | null>(null);
  const [disputeReason, setDisputeReason] = useState("");
  
  const { data: portal, isLoading } = useGetCandidatePortal(token, {
    query: { enabled: !!token, queryKey: getGetCandidatePortalQueryKey(token) }
  });

  const createDispute = useCreateDispute({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetCandidatePortalQueryKey(token) });
        setDisputeCheckId(null);
        setDisputeReason("");
      }
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <Skeleton className="h-12 w-48" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  if (!portal || !portal.candidate) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-sm text-center border">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Invalid or Expired Link</h2>
          <p className="text-slate-500">The portal link you used is no longer valid. Please contact your hiring manager for a new link.</p>
        </div>
      </div>
    );
  }

  const { candidate, checkResults, disputes } = portal;

  const getDisputeForCheck = (checkId: number) => {
    return disputes?.find(d => d.checkResultId === checkId);
  };

  const submitDispute = () => {
    if (disputeCheckId && disputeReason.trim()) {
      createDispute.mutate({
        data: {
          checkResultId: disputeCheckId,
          reason: disputeReason
        }
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-blue-100">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
          <div className="bg-blue-600 text-white p-1.5 rounded flex items-center justify-center">
            <ShieldCheck size={20} className="stroke-[2.5]" />
          </div>
          <span className="font-bold text-lg tracking-tight text-slate-800">ScreenIQ</span>
          <span className="text-slate-400 text-sm ml-2 font-medium">Candidate Portal</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        
        {/* Welcome Section */}
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-2">
            Welcome, {candidate.name.split(' ')[0]}
          </h1>
          <p className="text-lg text-slate-600">
            Review your background screening status for the <strong>{candidate.position}</strong> position.
          </p>
        </div>

        {/* Global Status Banner */}
        <div className={`p-6 rounded-xl border-2 flex items-center gap-5 ${
          candidate.status === 'completed' ? 'bg-green-50 border-green-200 text-green-900' :
          candidate.status === 'flagged' || candidate.status === 'adverse_action' ? 'bg-amber-50 border-amber-200 text-amber-900' :
          'bg-blue-50 border-blue-200 text-blue-900'
        }`}>
          <div className={`p-3 rounded-full shrink-0 ${
            candidate.status === 'completed' ? 'bg-green-100 text-green-600' :
            candidate.status === 'flagged' || candidate.status === 'adverse_action' ? 'bg-amber-100 text-amber-600' :
            'bg-blue-100 text-blue-600'
          }`}>
            {candidate.status === 'completed' ? <CheckCircle2 className="w-8 h-8" /> :
             candidate.status === 'flagged' || candidate.status === 'adverse_action' ? <AlertTriangle className="w-8 h-8" /> :
             <Clock className="w-8 h-8" />}
          </div>
          <div>
            <h2 className="text-xl font-bold mb-1">
              {candidate.status === 'completed' ? 'Screening Complete' :
               candidate.status === 'flagged' || candidate.status === 'adverse_action' ? 'Review Required' :
               'Screening in Progress'}
            </h2>
            <p className="font-medium text-sm opacity-90">
              {candidate.status === 'completed' ? 'Your background check has been finalized and sent to the employer.' :
               candidate.status === 'flagged' || candidate.status === 'adverse_action' ? 'The employer is reviewing the findings. You have the right to dispute inaccuracies.' :
               'We are currently verifying your information. This usually takes 1-3 business days.'}
            </p>
          </div>
        </div>

        {/* Check Results Section */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="p-6 border-b bg-slate-50/50">
            <h3 className="font-bold text-xl flex items-center gap-2">
              <FileText className="w-5 h-5 text-slate-500" />
              Check Results
            </h3>
          </div>
          
          <div className="divide-y">
            {checkResults && checkResults.length > 0 ? (
              checkResults.map((check) => {
                const isFlagged = check.status === 'flag' || check.status === 'violations' || check.status === 'discrepancy';
                const isClear = check.status === 'clear' || check.status === 'clean' || check.status === 'confirmed';
                const existingDispute = getDisputeForCheck(check.id);

                return (
                  <div key={check.id} className="p-6 sm:px-8">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div>
                        <h4 className="font-bold text-lg capitalize text-slate-900 mb-1">{check.checkType} Check</h4>
                        <p className="text-sm text-slate-500 font-medium mb-3">Source: {check.dataSource}</p>
                        
                        {existingDispute ? (
                          <div className="bg-slate-50 rounded-md border p-3 mt-4">
                            <div className="flex items-center gap-2 mb-2">
                              <MessageSquare className="w-4 h-4 text-blue-600" />
                              <span className="font-semibold text-sm">Dispute Filed</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase ${
                                existingDispute.status === 'resolved' ? 'bg-green-100 text-green-700' :
                                existingDispute.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                'bg-blue-100 text-blue-700'
                              }`}>
                                {existingDispute.status.replace('_', ' ')}
                              </span>
                            </div>
                            <p className="text-sm text-slate-600 italic">"{existingDispute.reason}"</p>
                            {existingDispute.resolution && (
                              <div className="mt-3 text-sm border-t pt-3">
                                <span className="font-semibold block mb-1">Resolution:</span>
                                <span className="text-slate-700">{existingDispute.resolution}</span>
                              </div>
                            )}
                          </div>
                        ) : isFlagged && (
                          <div className="mt-4">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 font-semibold"
                              onClick={() => setDisputeCheckId(check.id)}
                            >
                              Dispute This Finding
                            </Button>
                          </div>
                        )}
                      </div>
                      
                      <div className={`px-4 py-1.5 rounded-full font-bold text-sm inline-flex items-center gap-2 self-start ${
                        isClear ? 'bg-green-100 text-green-700' : 
                        isFlagged ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {isClear ? <CheckCircle2 className="w-4 h-4" /> : 
                         isFlagged ? <AlertTriangle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                        <span className="capitalize">{check.statusLabel || check.status}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-12 text-center text-slate-500">
                Checks have not been initiated or results are not yet available.
              </div>
            )}
          </div>
        </div>

        {/* FCRA Rights Footer */}
        <div className="bg-slate-200/50 rounded-lg p-6 text-sm text-slate-600 border border-slate-200">
          <h4 className="font-bold text-slate-800 mb-2 uppercase tracking-wide text-xs">Your Rights Under FCRA</h4>
          <p className="mb-2">
            The Fair Credit Reporting Act (FCRA) gives you specific rights when you are the subject of a background screening report for employment purposes. 
          </p>
          <a href="#" className="text-blue-600 hover:underline font-medium inline-flex items-center gap-1">
            Download A Summary of Your Rights <FileText className="w-3 h-3" />
          </a>
        </div>
      </main>

      {/* Dispute Dialog */}
      <Dialog open={!!disputeCheckId} onOpenChange={(open) => !open && setDisputeCheckId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dispute Finding</DialogTitle>
            <DialogDescription>
              If you believe this check result is inaccurate, you can submit a dispute. We will investigate your claim within 30 days.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="block text-sm font-semibold mb-2">Please explain why this finding is incorrect:</label>
            <Textarea 
              placeholder="Provide details about the inaccuracy..." 
              className="min-h-[120px]"
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisputeCheckId(null)}>Cancel</Button>
            <Button onClick={submitDispute} disabled={!disputeReason.trim() || createDispute.isPending}>
              {createDispute.isPending ? "Submitting..." : "Submit Dispute"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
