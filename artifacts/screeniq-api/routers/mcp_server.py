"""
ScreenIQ MCP Server — Streamable HTTP (JSON-RPC 2.0) transport.
Compatible with Claude Desktop, Cursor, and VS Code MCP clients.
"""
import json
from datetime import datetime, timezone
from typing import Any
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse, StreamingResponse

from database import get_db

router = APIRouter(prefix="/mcp", tags=["mcp"])

SERVER_INFO = {
    "name": "screeniq",
    "version": "1.0.0",
    "description": "ScreenIQ background screening platform — operator and candidate tools",
}

TOOLS = [
    {
        "name": "list_candidates",
        "description": "List all candidates with their current status, screening type, and package.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "status": {"type": "string", "description": "Filter by status: pending, in_progress, completed, flagged, adverse_action"},
                "screeningType": {"type": "string", "description": "Filter by type: employment or tenant"},
            },
        },
    },
    {
        "name": "get_candidate",
        "description": "Get full profile and check status for a specific candidate by ID.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "candidateId": {"type": "integer", "description": "The candidate ID"},
            },
            "required": ["candidateId"],
        },
    },
    {
        "name": "get_report",
        "description": "Get complete screening results with AI risk assessment for a candidate.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "candidateId": {"type": "integer", "description": "The candidate ID"},
            },
            "required": ["candidateId"],
        },
    },
    {
        "name": "get_analytics",
        "description": "Get platform analytics: attach rate, conversion rate, RPR, time to value, and backlog health.",
        "inputSchema": {
            "type": "object",
            "properties": {},
        },
    },
    {
        "name": "get_alerts",
        "description": "Get continuous monitoring alerts for enrolled employees.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "severity": {"type": "string", "description": "Filter by severity: critical, warning, info"},
            },
        },
    },
    {
        "name": "get_my_report",
        "description": "Candidate tool — get own report status and results using portal token.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "portalToken": {"type": "string", "description": "The candidate's portal token from their email link"},
            },
            "required": ["portalToken"],
        },
    },
]


def _execute_tool(name: str, arguments: dict) -> Any:
    with get_db() as conn:
        with conn.cursor() as cur:

            if name == "list_candidates":
                filters = []
                params = []
                if arguments.get("status"):
                    filters.append("c.status = %s")
                    params.append(arguments["status"])
                if arguments.get("screeningType"):
                    filters.append("c.screening_type = %s")
                    params.append(arguments["screeningType"])
                where = ("WHERE " + " AND ".join(filters)) if filters else ""
                cur.execute(f"""
                    SELECT id, name, position, status, screening_type, email, created_at
                    FROM candidates {where} ORDER BY created_at DESC
                """, params)
                rows = cur.fetchall()
                return {
                    "candidates": [
                        {
                            "id": r[0], "name": r[1], "position": r[2],
                            "status": r[3], "screeningType": r[4],
                            "email": r[5], "createdAt": r[6].isoformat() if r[6] else None,
                        }
                        for r in rows
                    ],
                    "total": len(rows),
                }

            elif name == "get_candidate":
                cid = arguments["candidateId"]
                cur.execute("""
                    SELECT id, name, position, status, screening_type, email, date_of_birth, created_at
                    FROM candidates WHERE id = %s
                """, (cid,))
                row = cur.fetchone()
                if not row:
                    return {"error": f"Candidate {cid} not found"}
                cur.execute("""
                    SELECT status, checks_total, checks_completed, created_at
                    FROM screening_runs WHERE candidate_id = %s ORDER BY created_at DESC LIMIT 1
                """, (cid,))
                run = cur.fetchone()
                return {
                    "id": row[0], "name": row[1], "position": row[2],
                    "status": row[3], "screeningType": row[4], "email": row[5],
                    "dateOfBirth": row[6], "createdAt": row[7].isoformat() if row[7] else None,
                    "latestRun": {
                        "status": run[0], "checksTotal": run[1],
                        "checksCompleted": run[2], "startedAt": run[3].isoformat() if run[3] else None,
                    } if run else None,
                }

            elif name == "get_report":
                cid = arguments["candidateId"]
                cur.execute("""
                    SELECT sr.id, sr.status FROM screening_runs sr
                    WHERE sr.candidate_id = %s ORDER BY sr.created_at DESC LIMIT 1
                """, (cid,))
                run = cur.fetchone()
                if not run:
                    return {"error": "No screening run found for this candidate"}
                run_id, run_status = run
                cur.execute("""
                    SELECT check_type, status, status_label, confidence_score
                    FROM check_results WHERE screening_run_id = %s
                """, (run_id,))
                checks = [
                    {"checkType": r[0], "status": r[1], "statusLabel": r[2], "confidence": float(r[3])}
                    for r in cur.fetchall()
                ]
                cur.execute("""
                    SELECT overall_risk, key_findings, fcra_adverse_flag
                    FROM risk_assessments WHERE screening_run_id = %s
                """, (run_id,))
                ra = cur.fetchone()
                return {
                    "runId": run_id, "runStatus": run_status,
                    "checks": checks,
                    "riskAssessment": {
                        "overallRisk": ra[0], "keyFindings": ra[1], "fcraAdverseFlag": ra[2],
                    } if ra else None,
                }

            elif name == "get_analytics":
                cur.execute("SELECT COUNT(*) FROM candidates")
                total = cur.fetchone()[0]
                cur.execute("SELECT COUNT(DISTINCT candidate_id) FROM screening_runs")
                with_runs = cur.fetchone()[0]
                cur.execute("SELECT COUNT(*) FROM screening_runs WHERE status = 'completed'")
                completed = cur.fetchone()[0]
                cur.execute("SELECT COUNT(*) FROM screening_runs WHERE status IN ('pending','running')")
                pending = cur.fetchone()[0]
                cur.execute("SELECT COUNT(*) FROM adverse_actions WHERE stage NOT IN ('closed')")
                adverse = cur.fetchone()[0]
                return {
                    "totalCandidates": total,
                    "attachRate": round(with_runs / total, 4) if total else 0,
                    "completedRuns": completed,
                    "pendingBacklog": pending,
                    "adverseActionsOpen": adverse,
                    "generatedAt": datetime.now(timezone.utc).isoformat(),
                }

            elif name == "get_alerts":
                severity = arguments.get("severity")
                if severity:
                    cur.execute("""
                        SELECT ma.id, c.name, ma.alert_type, ma.severity, ma.description, ma.status
                        FROM monitoring_alerts ma JOIN candidates c ON c.id = ma.candidate_id
                        WHERE ma.severity = %s ORDER BY ma.created_at DESC
                    """, (severity,))
                else:
                    cur.execute("""
                        SELECT ma.id, c.name, ma.alert_type, ma.severity, ma.description, ma.status
                        FROM monitoring_alerts ma JOIN candidates c ON c.id = ma.candidate_id
                        ORDER BY ma.created_at DESC
                    """)
                rows = cur.fetchall()
                return {
                    "alerts": [
                        {"id": r[0], "candidateName": r[1], "alertType": r[2],
                         "severity": r[3], "description": r[4], "status": r[5]}
                        for r in rows
                    ],
                    "total": len(rows),
                }

            elif name == "get_my_report":
                token = arguments.get("portalToken", "")
                cur.execute("SELECT id, name, position, status FROM candidates WHERE portal_token = %s", (token,))
                row = cur.fetchone()
                if not row:
                    return {"error": "Invalid or expired portal token"}
                cid = row[0]
                cur.execute("""
                    SELECT id FROM screening_runs WHERE candidate_id = %s ORDER BY created_at DESC LIMIT 1
                """, (cid,))
                run = cur.fetchone()
                checks = []
                if run:
                    cur.execute("""
                        SELECT check_type, status, status_label FROM check_results WHERE screening_run_id = %s
                    """, (run[0],))
                    checks = [{"checkType": r[0], "status": r[1], "statusLabel": r[2]} for r in cur.fetchall()]
                return {
                    "candidateName": row[1], "position": row[2],
                    "overallStatus": row[3], "checks": checks,
                }

            else:
                return {"error": f"Unknown tool: {name}"}


@router.post("")
async def handle_mcp(request: Request):
    """Handle MCP JSON-RPC 2.0 requests."""
    try:
        body = await request.json()
    except Exception:
        return JSONResponse({"jsonrpc": "2.0", "error": {"code": -32700, "message": "Parse error"}, "id": None})

    req_id = body.get("id")
    method = body.get("method", "")
    params = body.get("params", {})

    def ok(result):
        return JSONResponse({"jsonrpc": "2.0", "result": result, "id": req_id})

    def err(code, message):
        return JSONResponse({"jsonrpc": "2.0", "error": {"code": code, "message": message}, "id": req_id})

    if method == "initialize":
        return ok({
            "protocolVersion": "2024-11-05",
            "serverInfo": SERVER_INFO,
            "capabilities": {"tools": {}},
        })

    elif method == "tools/list":
        return ok({"tools": TOOLS})

    elif method == "tools/call":
        tool_name = params.get("name")
        arguments = params.get("arguments", {})
        if not tool_name:
            return err(-32602, "Missing tool name")
        try:
            result = _execute_tool(tool_name, arguments)
            return ok({
                "content": [{"type": "text", "text": json.dumps(result, indent=2, default=str)}],
            })
        except Exception as e:
            return err(-32603, f"Tool execution error: {str(e)}")

    elif method == "ping":
        return ok({})

    else:
        return err(-32601, f"Method not found: {method}")


@router.get("")
async def mcp_sse(request: Request):
    """SSE endpoint for MCP server-to-client notifications."""
    async def event_stream():
        yield "data: {\"type\":\"ready\",\"server\":\"screeniq\"}\n\n"
    return StreamingResponse(event_stream(), media_type="text/event-stream")
