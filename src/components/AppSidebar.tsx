import { NavLink, useLocation } from "react-router-dom";
import { MapPin, Package, Truck, LayoutDashboard, Receipt, CreditCard, Users, UserSquare2, ClipboardList, Radar } from "lucide-react";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { useAuth, type Permissions } from "@/contexts/AuthContext";
import adoLogo from "@/assets/ado-logo.png";

const items: { title: string; url: string; icon: any; perm?: keyof Permissions; legacy?: keyof Permissions; }[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, perm: "dashboard" },
  { title: "Stations", url: "/stations", icon: MapPin, perm: "stations", legacy: "settings" },
  { title: "Clients", url: "/clients", icon: UserSquare2, perm: "clients", legacy: "settings" },
  { title: "Consignments", url: "/consignments", icon: Package, perm: "consignments", legacy: "reports" },
  { title: "Shipments", url: "/shipments", icon: Truck, perm: "shipments", legacy: "tracking" },
  { title: "Payments", url: "/payments", icon: CreditCard, perm: "payments", legacy: "billing" },
  { title: "Delivery Receipts", url: "/delivery-receipts", icon: Receipt, perm: "delivery_receipts", legacy: "settings" },
  { title: "Overall Details", url: "/overall-details", icon: ClipboardList, perm: "overall_details", legacy: "tracking" },
  { title: "Tracking System", url: "/tracking-system", icon: Radar, perm: "tracking_system", legacy: "tracking" },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const { role, permissions, user } = useAuth();
  const isActive = (url: string) => url === "/" ? pathname === "/" : pathname.startsWith(url);
  const visible = items.filter((i) => {
    if (!user) return true;
    if (role === "admin") return true;
    if (!i.perm) return true;
    return permissions[i.perm] || (i.legacy && permissions[i.legacy]);
  });

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-2">
        <div className="flex items-center justify-center w-full">
          {collapsed ? (
            <img src={adoLogo} alt="ADO" className="h-9 w-9 object-contain" />
          ) : (
            <img
              src={adoLogo}
              alt="ADO International Transport Nepal"
              className="w-full h-auto max-h-20 object-contain"
            />
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
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
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
                  <SidebarMenuButton asChild isActive={pathname.startsWith("/admin/users")} tooltip="User Management">
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
