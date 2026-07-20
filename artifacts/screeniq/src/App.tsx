import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter, Redirect } from 'wouter';

import Dashboard from '@/pages/dashboard';
import CandidatesList from '@/pages/candidates/index';
import CandidateDetail from '@/pages/candidates/detail';
import AdverseActionList from '@/pages/adverse-action/index';
import AdverseActionDetail from '@/pages/adverse-action/detail';
import ComplianceMetrics from '@/pages/compliance';
import CandidatePortal from '@/pages/portal';
import Analytics from '@/pages/analytics';
import Benchmarks from '@/pages/analytics/benchmarks';
import WBRReport from '@/pages/reports/wbr';
import TenantScreening from '@/pages/tenant';
import Architecture from '@/pages/architecture';
import ContinuousMonitoring from '@/pages/monitoring';
import DrugTesting from '@/pages/drug-testing';
import MCPDocs from '@/pages/mcp-docs';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/">
        <Redirect to="/dashboard" />
      </Route>
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/candidates" component={CandidatesList} />
      <Route path="/candidates/:id" component={CandidateDetail} />
      <Route path="/tenant" component={TenantScreening} />
      <Route path="/adverse-action" component={AdverseActionList} />
      <Route path="/adverse-action/:id" component={AdverseActionDetail} />
      <Route path="/compliance" component={ComplianceMetrics} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/analytics/benchmarks" component={Benchmarks} />
      <Route path="/reports/wbr" component={WBRReport} />
      <Route path="/architecture" component={Architecture} />
      <Route path="/monitoring" component={ContinuousMonitoring} />
      <Route path="/drug-testing" component={DrugTesting} />
      <Route path="/mcp-docs" component={MCPDocs} />
      <Route path="/portal/:token" component={CandidatePortal} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
