import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { MapPin, Package, Truck, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { api } from "@/lib/store";

const Index = () => {
  const [counts, setCounts] = useState({ stations: 0, consignments: 0, shipments: 0 });

  useEffect(() => {
    Promise.all([api.stations.list(), api.consignments.list(), api.shipments.list()])
      .then(([s, c, sh]) => setCounts({ stations: s.length, consignments: c.length, shipments: sh.length }))
      .catch(() => {});
  }, []);

  const cards = [
    { label: "Stations", count: counts.stations, icon: MapPin, to: "/stations", desc: "Network hubs" },
    { label: "Consignments", count: counts.consignments, icon: Package, to: "/consignments", desc: "Active bookings" },
    { label: "Shipments", count: counts.shipments, icon: Truck, to: "/shipments", desc: "On the move" },
  ] as const;

  return (
    <div>
      <PageHeader title="Dashboard" breadcrumbs={[{ label: "Home" }, { label: "Overview" }]} />
      <div className="p-6">
        <div className="rounded-xl bg-gradient-primary p-8 text-primary-foreground shadow-elegant">
          <p className="text-sm uppercase tracking-widest opacity-80">Welcome back</p>
          <h1 className="mt-2 text-3xl font-bold">ADO International Transport Nepal</h1>
          <p className="mt-2 max-w-2xl text-base opacity-90">
            Manage stations, consignments and shipments across China–Nepal–Tibet corridors from a single elegant workspace.
          </p>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <Link key={c.label} to={c.to} className="group rounded-xl border border-border bg-card p-5 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-elegant">
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary"><c.icon className="h-5 w-5" /></div>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
              </div>
              <div className="mt-4 text-3xl font-bold tracking-tight">{c.count}</div>
              <div className="mt-1 text-base font-medium">{c.label}</div>
              <div className="text-sm text-muted-foreground">{c.desc}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Index;
