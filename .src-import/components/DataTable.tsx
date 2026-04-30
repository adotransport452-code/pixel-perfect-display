import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";

export type Column<T> = {
  key: string;
  header: string;
  render?: (row: T, index: number) => ReactNode;
  className?: string;
  headerClassName?: string;
};

export function DataTable<T extends { id: string }>({
  columns,
  data,
  empty = "No data found",
  stickyLastColumn = true,
  maxHeight = "70vh",
  selectable = false,
  selectedIds = [],
  onToggleRow,
  onToggleAll,
}: {
  columns: Column<T>[];
  data: T[];
  empty?: string;
  stickyLastColumn?: boolean;
  maxHeight?: string;
  selectable?: boolean;
  selectedIds?: string[];
  onToggleRow?: (id: string) => void;
  onToggleAll?: (checked: boolean) => void;
}) {
  const lastIdx = columns.length - 1;
  const stickyKey = stickyLastColumn && columns[lastIdx]?.key === "actions";
  const allSelected = selectable && data.length > 0 && data.every((r) => selectedIds.includes(r.id));
  const someSelected = selectable && data.some((r) => selectedIds.includes(r.id)) && !allSelected;

  return (
    <div className="rounded-lg border border-border bg-card shadow-card">
      <div className="overflow-auto relative" style={{ maxHeight }}>
        <table className="w-full text-sm border-separate border-spacing-0">
          <thead className="sticky top-0 z-30">
            <tr className="text-left">
              {selectable && (
                <th className="bg-gradient-primary px-3 py-3 border-b border-primary/30 w-10 sticky left-0 z-40">
                  <Checkbox
                    checked={allSelected ? true : someSelected ? "indeterminate" : false}
                    onCheckedChange={(v) => onToggleAll?.(!!v)}
                    className="border-primary-foreground bg-white/20 data-[state=checked]:bg-white data-[state=checked]:text-primary"
                  />
                </th>
              )}
              {columns.map((c, idx) => {
                const isSticky = stickyKey && idx === lastIdx;
                return (
                  <th
                    key={c.key}
                    className={cn(
                      "bg-gradient-primary px-4 py-3 font-bold text-xs uppercase tracking-wider text-primary-foreground border-b border-primary/30 whitespace-nowrap",
                      isSticky && "sticky right-0 z-40",
                      c.className,
                      c.headerClassName
                    )}
                  >
                    {c.header}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className="px-4 py-12 text-center text-muted-foreground">
                  {empty}
                </td>
              </tr>
            ) : (
              data.map((row, i) => (
                <tr key={row.id} className="group transition-colors">
                  {selectable && (
                    <td className="px-3 py-3 align-middle border-t border-border/60 bg-card group-hover:bg-accent/30 sticky left-0 z-10">
                      <Checkbox
                        checked={selectedIds.includes(row.id)}
                        onCheckedChange={() => onToggleRow?.(row.id)}
                      />
                    </td>
                  )}
                  {columns.map((c, idx) => {
                    const isSticky = stickyKey && idx === lastIdx;
                    return (
                      <td
                        key={c.key}
                        className={cn(
                          "px-4 py-3 align-middle border-t border-border/60 bg-card group-hover:bg-accent/30 whitespace-nowrap",
                          isSticky && "sticky right-0 z-20",
                          c.className
                        )}
                      >
                        {c.render ? c.render(row, i) : (row as any)[c.key]}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}