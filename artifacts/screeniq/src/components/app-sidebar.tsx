import { Link, useLocation } from "wouter";
import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarProvider, SidebarFooter, SidebarGroup, SidebarGroupLabel, SidebarGroupContent } from "@/components/ui/sidebar";
import { LayoutDashboard, Users, ShieldAlert, ShieldCheck, LogOut, Home, LineChart, FileText, Network, Eye, FlaskConical, Zap } from "lucide-react";

export function AppSidebar() {
  const [location] = useLocation();

  const navItems = [
    { label: "Dashboard",            href: "/dashboard",           icon: LayoutDashboard },
    { label: "Candidates",           href: "/candidates",          icon: Users },
    { label: "Tenant Screening",     href: "/tenant",              icon: Home },
    { label: "Adverse Action",       href: "/adverse-action",      icon: ShieldAlert },
    { label: "Compliance",           href: "/compliance",          icon: ShieldCheck },
    { label: "Analytics",            href: "/analytics",           icon: LineChart },
    { label: "WBR Report",           href: "/reports/wbr",         icon: FileText },
    { label: "Continuous Monitoring",href: "/monitoring",          icon: Eye },
    { label: "Drug Testing",         href: "/drug-testing",        icon: FlaskConical },
    { label: "MCP Integration",      href: "/mcp-docs",            icon: Zap },
    { label: "Architecture",         href: "/architecture",        icon: Network },
  ];

  return (
    <Sidebar variant="sidebar" collapsible="none" className="border-r shadow-sm">
      <SidebarHeader className="py-4 px-4 flex items-center justify-center border-b border-sidebar-border/50">
        <div className="flex flex-col w-full px-2 gap-0.5">
          <div className="flex items-center gap-2">
            <div className="bg-primary text-primary-foreground p-1.5 rounded-md flex items-center justify-center">
              <ShieldCheck size={20} className="stroke-[2.5]" />
            </div>
            <span className="font-bold text-lg tracking-tight">ScreenIQ</span>
          </div>
          <p className="text-[9px] text-sidebar-foreground/40 tracking-wide pl-0.5 leading-tight">
            AI-Native Verification Intelligence<br />
            FCRA · DOT · MCP-Ready
          </p>
        </div>
      </SidebarHeader>
      
      <SidebarContent className="py-4 px-3">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider mb-2">Platform</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = location === item.href || (location.startsWith(item.href) && item.href !== "/");
                return (
                  <SidebarMenuItem key={item.href} className="mb-0.5">
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive}
                      className={`font-medium transition-colors ${isActive ? 'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground' : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent'}`}
                    >
                      <Link href={item.href} className="flex items-center gap-3 px-3 py-2">
                        <item.icon size={17} />
                        <span className="text-[13px]">{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border/50">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton className="text-sidebar-foreground/70 hover:text-sidebar-foreground w-full flex items-center gap-3 px-3 py-2">
              <LogOut size={17} />
              <span className="text-[13px]">Log out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
