import { AppLayout } from "@/components/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Terminal, Zap, Users, FileText, BarChart2, Bell, Lock } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const TOOLS = [
  {
    name: "list_candidates",
    category: "Operator",
    icon: <Users className="w-4 h-4" />,
    description: "List all candidates with their current status, screening type, and package.",
    params: [
      { name: "status", type: "string", required: false, desc: "Filter by: pending, in_progress, completed, flagged, adverse_action" },
      { name: "screeningType", type: "string", required: false, desc: "Filter by: employment or tenant" },
    ],
    example: "Show me all flagged candidates",
  },
  {
    name: "get_candidate",
    category: "Operator",
    icon: <Users className="w-4 h-4" />,
    description: "Get full profile and check status for a specific candidate by ID.",
    params: [
      { name: "candidateId", type: "integer", required: true, desc: "The candidate's numeric ID" },
    ],
    example: "Get the full profile for candidate 3",
  },
  {
    name: "get_report",
    category: "Operator",
    icon: <FileText className="w-4 h-4" />,
    description: "Get complete screening results with AI risk assessment for a candidate.",
    params: [
      { name: "candidateId", type: "integer", required: true, desc: "The candidate's numeric ID" },
    ],
    example: "Pull the full report and risk assessment for candidate 1",
  },
  {
    name: "get_analytics",
    category: "Operator",
    icon: <BarChart2 className="w-4 h-4" />,
    description: "Get platform analytics: attach rate, conversion rate, RPR, time to value, and backlog health.",
    params: [],
    example: "What is our current attach rate and backlog?",
  },
  {
    name: "get_alerts",
    category: "Operator",
    icon: <Bell className="w-4 h-4" />,
    description: "Get continuous monitoring alerts for enrolled employees.",
    params: [
      { name: "severity", type: "string", required: false, desc: "Filter by: critical, warning, or info" },
    ],
    example: "Show me all critical monitoring alerts",
  },
  {
    name: "get_my_report",
    category: "Candidate",
    icon: <Lock className="w-4 h-4" />,
    description: "Candidate tool — get your own report status and results using your portal token.",
    params: [
      { name: "portalToken", type: "string", required: true, desc: "Your portal token from the email link" },
    ],
    example: "What is the status of my background check?",
  },
];

const CLAUDE_PROMPTS = [
  { prompt: "Show me candidates pending review", tool: "list_candidates" },
  { prompt: "What is my attach rate this month?", tool: "get_analytics" },
  { prompt: "Get the full report for candidate 2", tool: "get_report" },
  { prompt: "Are there any critical monitoring alerts?", tool: "get_alerts" },
  { prompt: "What is the status of Jane Smith's background check?", tool: "list_candidates + get_report" },
];

const MCP_ENDPOINT = `${typeof window !== "undefined" ? window.location.origin : ""}${BASE}/api/mcp`;

const SETUP_CONFIGS = [
  {
    client: "Claude Desktop",
    file: "claude_desktop_config.json",
    path: "~/Library/Application Support/Claude/ (macOS)\n%APPDATA%\\Claude\\ (Windows)",
    config: `{
  "mcpServers": {
    "screeniq": {
      "url": "${MCP_ENDPOINT}",
      "transport": "http"
    }
  }
}`,
  },
  {
    client: "Cursor",
    file: ".cursor/mcp.json",
    path: "Project root or ~/.cursor/mcp.json",
    config: `{
  "mcpServers": {
    "screeniq": {
      "url": "${MCP_ENDPOINT}",
      "transport": "streamable-http"
    }
  }
}`,
  },
  {
    client: "VS Code (Copilot)",
    file: ".vscode/mcp.json",
    path: "Project root .vscode/mcp.json",
    config: `{
  "servers": {
    "screeniq": {
      "type": "http",
      "url": "${MCP_ENDPOINT}"
    }
  }
}`,
  },
];

export default function MCPDocs() {
  return (
    <AppLayout>
      <div className="flex flex-col gap-10 pb-12 max-w-4xl">
        {/* Hero */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-primary/10 rounded-xl">
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">MCP Integration</h1>
              <p className="text-muted-foreground text-sm mt-0.5">Model Context Protocol — connect ScreenIQ to Claude, Cursor, and VS Code</p>
            </div>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            ScreenIQ exposes a fully-compliant MCP server over Streamable HTTP. Connect any MCP-compatible AI client and query candidates, reports, analytics, and monitoring alerts using natural language — without leaving your AI tool.
          </p>

          <div className="mt-4 flex items-center gap-2 bg-muted rounded-xl px-4 py-3 font-mono text-sm">
            <Terminal className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground select-all break-all">{MCP_ENDPOINT}</span>
            <Badge variant="secondary" className="ml-auto shrink-0">POST · SSE</Badge>
          </div>
        </div>

        {/* Tools */}
        <div>
          <h2 className="text-xl font-bold mb-4">Available Tools</h2>
          <div className="space-y-3">
            {TOOLS.map(tool => (
              <Card key={tool.name}>
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg shrink-0 ${tool.category === "Operator" ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"}`}>
                      {tool.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap mb-1.5">
                        <code className="text-sm font-bold font-mono">{tool.name}</code>
                        <Badge variant="outline" className={`text-[10px] ${tool.category === "Operator" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-purple-50 text-purple-700 border-purple-200"}`}>
                          {tool.category}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{tool.description}</p>

                      {tool.params.length > 0 && (
                        <div className="space-y-1.5 mb-3">
                          {tool.params.map(p => (
                            <div key={p.name} className="flex items-start gap-2 text-xs">
                              <code className="font-mono bg-muted px-1.5 py-0.5 rounded shrink-0">{p.name}</code>
                              <Badge variant="secondary" className="text-[10px] shrink-0">{p.type}</Badge>
                              {p.required && <Badge variant="outline" className="text-[10px] text-red-600 border-red-200 shrink-0">required</Badge>}
                              <span className="text-muted-foreground">{p.desc}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-xs bg-muted/60 rounded-lg px-3 py-2">
                        <span className="text-muted-foreground font-medium">Try:</span>
                        <span className="italic text-foreground">"{tool.example}"</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Example Claude prompts */}
        <div>
          <h2 className="text-xl font-bold mb-4">Example Claude Prompts</h2>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {CLAUDE_PROMPTS.map((p, i) => (
                  <div key={i} className="px-5 py-3.5 flex items-center justify-between gap-4">
                    <p className="text-sm italic text-foreground">"{p.prompt}"</p>
                    <code className="text-[10px] font-mono text-muted-foreground shrink-0 bg-muted px-2 py-1 rounded whitespace-nowrap">{p.tool}</code>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Setup */}
        <div>
          <h2 className="text-xl font-bold mb-1">Setup Instructions</h2>
          <p className="text-sm text-muted-foreground mb-4">Add the following config to your AI client. No API key required — the server is open for demo access.</p>
          <div className="space-y-4">
            {SETUP_CONFIGS.map(cfg => (
              <Card key={cfg.client}>
                <CardHeader className="pb-3 pt-4 px-5">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Terminal className="w-4 h-4" />
                    {cfg.client}
                    <code className="text-xs font-normal bg-muted px-2 py-0.5 rounded ml-1">{cfg.file}</code>
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">{cfg.path}</p>
                </CardHeader>
                <CardContent className="pt-0 px-5 pb-5">
                  <pre className="bg-slate-950 text-slate-100 rounded-xl p-4 text-xs font-mono overflow-x-auto leading-relaxed whitespace-pre">
                    {cfg.config}
                  </pre>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Protocol */}
        <div>
          <h2 className="text-xl font-bold mb-4">Protocol Reference</h2>
          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                {[
                  ["Transport", "Streamable HTTP (SSE-based)"],
                  ["Protocol", "MCP 2024-11-05"],
                  ["Encoding", "JSON-RPC 2.0"],
                  ["Auth", "None (demo — open access)"],
                  ["Methods", "initialize · tools/list · tools/call · ping"],
                  ["Response format", "JSON or SSE stream"],
                ].map(([k, v]) => (
                  <div key={k}>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-0.5">{k}</p>
                    <p className="font-mono text-xs">{v}</p>
                  </div>
                ))}
              </div>
              <div className="pt-3 border-t">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Quick test (curl)</p>
                <pre className="bg-slate-950 text-slate-100 rounded-xl p-4 text-xs font-mono overflow-x-auto leading-relaxed">
{`curl -X POST ${MCP_ENDPOINT} \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'`}
                </pre>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
