import { Link } from "wouter";
import { useGetDashboardStats, useListCandidates } from "@workspace/api-client-react";
import { getListCandidatesQueryKey } from "@workspace/api-client-react";
import { AppLayout } from "@/components/app-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldAlert, AlertTriangle, ChevronRight, Clock, CheckCircle2, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function AdverseActionList() {
  const { data: stats } = useGetDashboardStats();
  
  const { data: adverseCandidates, isLoading } = useListCandidates({ status: 'adverse_action' }, {
    query: { queryKey: getListCandidatesQueryKey({ status: 'adverse_action' }) }
  });

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 h-full pb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
              <ShieldAlert className="text-orange-500 w-8 h-8" />
              Adverse Actions
            </h1>
            <p className="text-muted-foreground mt-1">Manage FCRA compliance workflows for flagged candidates.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="shadow-sm border-orange-200 bg-orange-50/50 p-6 flex flex-col justify-center items-center text-center col-span-1">
            <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg text-orange-900 mb-1">Open Workflows</h3>
            <span className="text-4xl font-black text-orange-600">{stats?.adverseActionsOpen || adverseCandidates?.length || 0}</span>
            <p className="text-sm text-orange-800/70 mt-2 font-medium">Currently requiring attention</p>
          </Card>
          
          <Card className="md:col-span-3 border-border shadow-sm flex flex-col overflow-hidden">
            <div className="bg-muted/20 border-b p-4">
              <h3 className="font-bold text-lg">Active Workflows</h3>
            </div>
            <div className="flex-1 overflow-auto bg-card">
              {isLoading ? (
                <div className="p-12 text-center text-muted-foreground">Loading workflows...</div>
              ) : adverseCandidates?.length ? (
                <div className="divide-y divide-border/50">
                  {adverseCandidates.map(candidate => (
                    <div key={candidate.id} className="p-4 hover:bg-muted/20 transition-colors flex items-center justify-between group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
                          <User size={20} />
                        </div>
                        <div>
                          <div className="font-bold text-foreground group-hover:text-primary transition-colors">
                            {candidate.name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {candidate.position} • Started {format(new Date(candidate.createdAt), "MMM d, yyyy")}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/adverse-action/${candidate.id}`}>
                            Manage Workflow
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col justify-center text-center items-center p-12 bg-card">
                  <ShieldAlert className="w-12 h-12 text-muted-foreground/30 mb-4" />
                  <h3 className="text-xl font-bold text-foreground">No Active Workflows</h3>
                  <p className="text-muted-foreground mt-2 max-w-md">
                    To initiate an adverse action workflow, search for a candidate with a flagged screening result and click "Initiate Adverse Action" on their profile.
                  </p>
                  <Button asChild className="mt-6" size="sm" variant="outline">
                    <Link href="/candidates">Go to Candidates</Link>
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
