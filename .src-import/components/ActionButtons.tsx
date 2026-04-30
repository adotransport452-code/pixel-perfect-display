import { Eye, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function ActionButtons({
  onView,
  onEdit,
  onDelete,
}: {
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const btn =
    "inline-flex h-8 w-8 items-center justify-center rounded-md transition-all hover:scale-105 active:scale-95";
  return (
    <div className="flex items-center gap-1.5">
      {onView && (
        <button
          onClick={onView}
          title="View"
          className={cn(btn, "bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground")}
        >
          <Eye className="h-4 w-4" />
        </button>
      )}
      {onEdit && (
        <button
          onClick={onEdit}
          title="Edit"
          className={cn(btn, "bg-warning/15 text-warning hover:bg-warning hover:text-warning-foreground")}
        >
          <Pencil className="h-4 w-4" />
        </button>
      )}
      {onDelete && (
        <button
          onClick={onDelete}
          title="Delete"
          className={cn(
            btn,
            "bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground"
          )}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}