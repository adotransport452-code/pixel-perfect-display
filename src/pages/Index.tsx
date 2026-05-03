import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import {
  MapPin, Package, Truck, ArrowRight, Users, CreditCard, FileCheck,
  TrendingUp, DollarSign, Activity, CheckCircle2, Clock, AlertCircle,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend, BarChart, Bar,
} from "recharts";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api, type Consignment, type Shipment, type Payment, type Client, type Station } from "@/lib/store";

const fmtMoney = (n: number) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n || 0);

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(217 91% 60%)", "hsl(142 71% 45%)", "hsl(38 92% 50%)", "hsl(0 84% 60%)"];

const Index = () => {
  const [stations, setStations] = useState<Station[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [consignments, setConsignments] = useState<Consignment[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.stations.list(), api.clients.list(), api.consignments.list(),
      api.shipments.list(), api.payments.list(),
    ])
      .then(([st, cl, co, sh, pa]) => {
        setStations(st); setClients(cl); setConsignments(co); setShipments(sh); setPayments(pa);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const totalRevenue = payments.reduce((s, p) => s + (Number(p.paid_amount) || 0), 0);
    const outstanding = consignments.reduce((s, c) => s + (Number(c.grand_total) || 0), 0) - totalRevenue;
    const totalCBM = consignments.reduce((s, c) => s + (Number(c.cbm) || 0), 0);
    const totalWeight = consignments.reduce((s, c) => s + (Number(c.weight) || 0), 0);
    const delivered = consignments.filter((c) => /deliver/i.test(c.status || "")).length;
    const inTransit = shipments.filter((s) => /transit|way/i.test(s.status || "")).length;
    return { totalRevenue, outstanding: Math.max(outstanding, 0), totalCBM, totalWeight, delivered, inTransit };
  }, [consignments, shipments, payments]);

  const monthly = useMemo(() => {
    const map = new Map<string, { month: string; consignments: number; revenue: number }>();
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleString("en", { month: "short" });
      map.set(key, { month: label, consignments: 0, revenue: 0 });
    }
    consignments.forEach((c) => {
      const d = new Date(c.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const r = map.get(key); if (r) r.consignments += 1;
    });
    payments.forEach((p) => {
      const d = new Date(p.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const r = map.get(key); if (r) r.revenue += Number(p.paid_amount) || 0;
    });
    return Array.from(map.values());
  }, [consignments, payments]);

  const statusPie = useMemo(() => {
    const counts: Record<string, number> = {};
    consignments.forEach((c) => {
      const k = c.status || "Pending";
      counts[k] = (counts[k] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [consignments]);

  const stationBars = useMemo(() => {
    const counts: Record<string, number> = {};
    consignments.forEach((c) => {
      const k = c.start_station || "—";
      counts[k] = (counts[k] || 0) + 1;
    });
    return Object.entries(counts).slice(0, 6).map(([name, value]) => ({ name, value }));
  }, [consignments]);

  const recent = useMemo(() => consignments.slice(0, 6), [consignments]);

  const kpis = [
    { label: "Total Revenue", value: `₹${fmtMoney(stats.totalRevenue)}`, icon: DollarSign, accent: "from-emerald-500 to-emerald-600" },
    { label: "Outstanding", value: `₹${fmtMoney(stats.outstanding)}`, icon: CreditCard, accent: "from-amber-500 to-orange-600" },
    { label: "Total CBM", value: fmtMoney(stats.totalCBM), icon: Activity, accent: "from-sky-500 to-blue-600" },
    { label: "Delivered", value: stats.delivered, icon: CheckCircle2, accent: "from-violet-500 to-purple-600" },
  ];

  const cards = [
    { label: "Stations", count: stations.length, icon: MapPin, to: "/stations" },
    { label: "Clients", count: clients.length, icon: Users, to: "/clients" },
    { label: "Consignments", count: consignments.length, icon: Package, to: "/consignments" },
    { label: "Shipments", count: shipments.length, icon: Truck, to: "/shipments" },
    { label: "Payments", count: payments.length, icon: CreditCard, to: "/payments" },
    { label: "In Transit", count: stats.inTransit, icon: Clock, to: "/tracking-system" },
  ];

  return (
    <div>
      <PageHeader title="Dashboard" breadcrumbs={[{ label: "Home" }, { label: "Overview" }]} />
      <div className="space-y-6 p-6">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-primary p-8 text-primary-foreground shadow-elegant">
          <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-24 -left-10 h-72 w-72 rounded-full bg-white/5 blur-3xl" />
          <div className="relative">
            <p className="text-xs uppercase tracking-[0.3em] opacity-80">Welcome back</p>
            <h1 className="mt-2 text-3xl font-bold md:text-4xl">ADO International Transport Nepal</h1>
            <p className="mt-2 max-w-2xl opacity-90">
              A unified workspace for stations, consignments, shipments and payments across the China–Nepal–Tibet corridor.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link to="/consignments" className="inline-flex items-center gap-2 rounded-lg bg-white/15 px-4 py-2 text-sm font-medium backdrop-blur hover:bg-white/25">
                <Package className="h-4 w-4" /> New Consignment
              </Link>
              <Link to="/tracking-system" className="inline-flex items-center gap-2 rounded-lg bg-white/15 px-4 py-2 text-sm font-medium backdrop-blur hover:bg-white/25">
                <Activity className="h-4 w-4" /> Live Tracking
              </Link>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((k) => (
            <Card key={k.label} className="overflow-hidden border-border shadow-card">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{k.label}</p>
                    <p className="mt-2 text-2xl font-bold tracking-tight">{loading ? "…" : k.value}</p>
                  </div>
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${k.accent} text-white shadow-md`}>
                    <k.icon className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-1 text-xs text-emerald-600">
                  <TrendingUp className="h-3 w-3" /> Live
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts */}
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2 shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Activity overview — last 6 months</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthly} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(142 71% 45%)" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="hsl(142 71% 45%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Legend />
                  <Area type="monotone" dataKey="consignments" stroke="hsl(var(--primary))" fill="url(#g1)" strokeWidth={2} />
                  <Area type="monotone" dataKey="revenue" stroke="hsl(142 71% 45%)" fill="url(#g2)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Consignment status</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              {statusPie.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No data yet</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusPie} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                      {statusPie.map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
                    </Pie>
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="shadow-card lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Top origin stations</CardTitle>
            </CardHeader>
            <CardContent className="h-[280px]">
              {stationBars.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No data yet</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stationBars}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-card lg:col-span-2">
            <CardHeader className="pb-2 flex-row items-center justify-between">
              <CardTitle className="text-base">Recent consignments</CardTitle>
              <Link to="/consignments" className="text-xs font-medium text-primary hover:underline">View all →</Link>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {recent.length === 0 && (
                  <div className="p-6 text-center text-sm text-muted-foreground">No consignments yet</div>
                )}
                {recent.map((c) => (
                  <div key={c.id} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-muted/40">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Package className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">{c.bill_no} · {c.marka}</div>
                        <div className="truncate text-xs text-muted-foreground">{c.start_station} → {c.end_station} · {c.client_name || "—"}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="hidden md:inline text-xs text-muted-foreground">₹{fmtMoney(Number(c.grand_total) || 0)}</span>
                      <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium">{c.status || "Pending"}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick links */}
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Quick access</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {cards.map((c) => (
              <Link key={c.label} to={c.to} className="group rounded-xl border border-border bg-card p-4 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-elegant">
                <div className="flex items-center justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <c.icon className="h-4 w-4" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
                </div>
                <div className="mt-3 text-2xl font-bold tracking-tight">{c.count}</div>
                <div className="text-xs text-muted-foreground">{c.label}</div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
