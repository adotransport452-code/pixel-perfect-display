import { NavLink, useLocation } from "react-router-dom";
import { MapPin, Package, Truck, LayoutDashboard, Receipt, CreditCard, Users, UserSquare2, ClipboardList } from "lucide-react";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { useAuth, type Permissions } from "@/contexts/AuthContext";

const items: { title: string; url: string; icon: any; perm?: keyof Permissions; }[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, perm: "dashboard" },
  { title: "Stations", url: "/stations", icon: MapPin, perm: "settings" },
  { title: "Clients", url: "/clients", icon: UserSquare2, perm: "settings" },
  { title: "Consignments", url: "/consignments", icon: Package, perm: "reports" },
  { title: "Shipments", url: "/shipments", icon: Truck, perm: "tracking" },
  { title: "Payments", url: "/payments", icon: CreditCard, perm: "billing" },
  { title: "Delivery Receipts", url: "/delivery-receipts", icon: Receipt, perm: "settings" },
  { title: "Overall Details", url: "/overall-details", icon: ClipboardList, perm: "tracking" },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const { role, permissions, user } = useAuth();
  const isActive = (url: string) => url === "/" ? pathname === "/" : pathname.startsWith(url);
  const visible = items.filter((i) => !user || role === "admin" || !i.perm || permissions[i.perm]);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground font-bold text-lg shadow-elegant">A</div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="font-bold text-sm text-sidebar-foreground">ADO Transport</span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Nepal</span>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Operations</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visible.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink to={item.url} end={item.url === "/"} className="flex items-center gap-3">
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {role === "admin" && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname.startsWith("/admin/users")}>
                    <NavLink to="/admin/users" className="flex items-center gap-3">
                      <Users className="h-4 w-4" />
                      {!collapsed && <span>User Management</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
