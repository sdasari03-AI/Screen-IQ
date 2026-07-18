import { useState } from "react";
import { Link } from "wouter";
import { useListCandidates, useCreateCandidate } from "@workspace/api-client-react";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Plus, UserPlus, Filter, ChevronRight, AlertCircle, Clock, CheckCircle2, MoreHorizontal } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { getListCandidatesQueryKey } from "@workspace/api-client-react";

const candidateSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Valid email is required"),
  position: z.string().min(2, "Position is required"),
  phone: z.string().optional(),
});

type CandidateFormValues = z.infer<typeof candidateSchema>;

export default function CandidatesList() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: candidates, isLoading } = useListCandidates(
    { search, status: statusFilter || undefined },
    { query: { enabled: true, queryKey: getListCandidatesQueryKey({ search, status: statusFilter || undefined }) } }
  );

  const createCandidate = useCreateCandidate({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCandidatesQueryKey() });
        setIsCreateOpen(false);
        form.reset();
      }
    }
  });

  const form = useForm<CandidateFormValues>({
    resolver: zodResolver(candidateSchema),
    defaultValues: {
      name: "",
      email: "",
      position: "",
      phone: "",
    },
  });

  function onSubmit(data: CandidateFormValues) {
    createCandidate.mutate({ data });
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="outline" className="bg-muted text-muted-foreground"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      case 'in_progress': return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200"><div className="w-2 h-2 rounded-full bg-blue-500 mr-1.5 animate-pulse" /> Running</Badge>;
      case 'completed': return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle2 className="w-3 h-3 mr-1" /> Cleared</Badge>;
      case 'flagged': return <Badge variant="destructive" className="bg-red-50 text-red-700 border-red-200"><AlertCircle className="w-3 h-3 mr-1" /> Flagged</Badge>;
      case 'adverse_action': return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" /> Adverse Action</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 h-full pb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Candidates</h1>
            <p className="text-muted-foreground mt-1">Manage and screen applicant pipeline.</p>
          </div>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 font-semibold shadow-sm">
                <UserPlus size={18} />
                New Candidate
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Candidate</DialogTitle>
                <DialogDescription>
                  Create a new candidate profile to begin the screening process.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Jane Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input placeholder="jane@example.com" type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="position"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Position Applied For</FormLabel>
                        <FormControl>
                          <Input placeholder="Senior Software Engineer" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="(555) 123-4567" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter className="pt-4">
                    <Button variant="outline" type="button" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={createCandidate.isPending}>
                      {createCandidate.isPending ? "Creating..." : "Create Candidate"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="border-border shadow-sm flex-1 flex flex-col overflow-hidden">
          <div className="p-4 border-b bg-muted/20 flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input 
                placeholder="Search candidates..." 
                className="pl-9 bg-background"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
              <Button 
                variant={statusFilter === "" ? "secondary" : "ghost"} 
                size="sm" 
                onClick={() => setStatusFilter("")}
                className="rounded-full"
              >
                All
              </Button>
              <Button 
                variant={statusFilter === "flagged" ? "secondary" : "ghost"} 
                size="sm" 
                onClick={() => setStatusFilter("flagged")}
                className="rounded-full text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                Flagged
              </Button>
              <Button 
                variant={statusFilter === "pending" ? "secondary" : "ghost"} 
                size="sm" 
                onClick={() => setStatusFilter("pending")}
                className="rounded-full"
              >
                Pending
              </Button>
              <Button 
                variant={statusFilter === "completed" ? "secondary" : "ghost"} 
                size="sm" 
                onClick={() => setStatusFilter("completed")}
                className="rounded-full"
              >
                Completed
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-auto bg-card">
            {isLoading ? (
              <div className="divide-y">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Skeleton className="w-10 h-10 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-5 w-40" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    </div>
                    <Skeleton className="h-8 w-24 rounded-full" />
                  </div>
                ))}
              </div>
            ) : candidates?.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center px-4">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <Search className="w-8 h-8 text-muted-foreground/50" />
                </div>
                <h3 className="text-lg font-semibold">No candidates found</h3>
                <p className="text-muted-foreground mt-1 max-w-sm">
                  {search || statusFilter ? "Try adjusting your search or filters to find what you're looking for." : "Add your first candidate to begin the screening process."}
                </p>
                {(!search && !statusFilter) && (
                  <Button className="mt-4" onClick={() => setIsCreateOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" /> Add Candidate
                  </Button>
                )}
              </div>
            ) : (
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-muted/40 uppercase text-xs font-semibold text-muted-foreground sticky top-0 z-10 backdrop-blur">
                  <tr>
                    <th className="px-6 py-4">Candidate</th>
                    <th className="px-6 py-4">Position</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Added</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {candidates?.map((candidate) => (
                    <tr key={candidate.id} className="hover:bg-muted/20 transition-colors group cursor-pointer">
                      <td className="px-6 py-4">
                        <Link href={`/candidates/${candidate.id}`} className="block">
                          <div className="font-semibold text-foreground group-hover:text-primary transition-colors">
                            {candidate.name}
                          </div>
                          <div className="text-muted-foreground text-xs mt-0.5">{candidate.email}</div>
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <Link href={`/candidates/${candidate.id}`} className="block">
                          {candidate.position}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <Link href={`/candidates/${candidate.id}`} className="block">
                          {getStatusBadge(candidate.status)}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        <Link href={`/candidates/${candidate.id}`} className="block">
                          {format(new Date(candidate.createdAt), "MMM d, yyyy")}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link href={`/candidates/${candidate.id}`}>
                          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                            <ChevronRight className="w-5 h-5" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
