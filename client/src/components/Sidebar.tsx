import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useLists, useDeleteList } from "@/hooks/use-lists";
import { CreateListDialog } from "./CreateListDialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api } from "@shared/routes";
import {
  LayoutDashboard,
  List as ListIcon,
  TrendingUp,
  X,
  Trash2,
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

interface SidebarProps {
  onClose?: () => void;
  className?: string;
}

export function Sidebar({ onClose, className }: SidebarProps) {
  const [location] = useLocation();
  const { data: lists } = useLists();
  const deleteList = useDeleteList();

  const renameList = useMutation({
    mutationFn: async ({ id, name }: { id: number; name: string }) => {
      const res = await apiRequest("PATCH", `/api/lists/${id}`, { name });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [api.lists.list.path],
      });
    },
  });

  // FIXED: Safe mutation instead of undefined function
  const clearAllLists = useMutation({
    mutationFn: async () => {
      // Replace with your real API if available
      const res = await apiRequest("DELETE", "/api/lists/items");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [api.lists.list.path],
      });
    },
  });

  const isAllStocks =
    location === "/" || location === "/stocks";

  return (
    <div
      className={cn(
        "w-64 border-r border-border bg-card flex flex-col h-screen",
        className
      )}
    >
      {/* Header */}
      <div className="p-6 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-primary/20 p-2 rounded-lg">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <h1 className="font-bold text-lg tracking-tight">
            TradeVault
          </h1>
        </div>

        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="md:hidden"
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      <div className="p-4">
        {/* All Stocks */}
        <Link href="/" onClick={onClose}>
          <div
            className={cn(
              "flex items-center gap-3 px-4 py-2.5 rounded-md text-sm font-medium transition-colors mb-6 cursor-pointer",
              isAllStocks
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <LayoutDashboard className="h-4 w-4" />
            All Stocks
          </div>
        </Link>

        {/* Lists Header */}
        <div className="flex items-center justify-between px-2 mb-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Your Lists
          </h2>

          <div className="flex items-center gap-1">
            {/* CLEAR ALL */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Clear all lists"
                  className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </AlertDialogTrigger>

              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Clear all stocks from all lists?
                  </AlertDialogTitle>

                  <AlertDialogDescription>
                    This will remove all stocks from every list.
                    Lists will remain intact.
                  </AlertDialogDescription>
                </AlertDialogHeader>

                <AlertDialogFooter>
                  <AlertDialogCancel>
                    Cancel
                  </AlertDialogCancel>

                  <AlertDialogAction
                    onClick={() =>
                      clearAllLists.mutate()
                    }
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Clear All
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <CreateListDialog />
          </div>
        </div>

        {/* Lists */}
        <ScrollArea className="h-[calc(100vh-250px)]">
          <div className="space-y-1 px-2">
            {lists?.map((list) => {
              const isActive =
                location.startsWith(
                  `/lists/${list.id}`
                );

              return (
                <div
                  key={list.id}
                  className={cn(
                    "flex items-center justify-between rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <Link
                    href={`/lists/${list.id}`}
                    onClick={onClose}
                    onContextMenu={(e) => {
                      e.preventDefault();

                      const action = window.prompt(
                        `List: "${list.name}"\n\nType "delete" or enter new name to rename:`
                      );

                      if (!action) return;

                      if (
                        action.toLowerCase() ===
                        "delete"
                      ) {
                        if (
                          window.confirm(
                            `Delete "${list.name}"?`
                          )
                        ) {
                          deleteList.mutate(list.id);
                        }
                      } else {
                        renameList.mutate({
                          id: list.id,
                          name: action.trim(),
                        });
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 flex-1 min-w-0"
                  >
                    <ListIcon className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate flex-1">
                      {list.name}
                    </span>

                    {list.itemCount > 0 && (
                      <span className="flex-shrink-0 text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
                        {list.itemCount}
                      </span>
                    )}
                  </Link>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <p className="text-xs text-muted-foreground px-2 mt-2">
          💡 Right-click any list to rename or delete
        </p>
      </div>

      {/* Footer */}
      <div className="mt-auto p-4 border-t border-border">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-primary to-blue-500" />
          <div className="text-sm">
            <p className="font-medium">Trader</p>
            <p className="text-xs text-muted-foreground">
              Pro Plan
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
