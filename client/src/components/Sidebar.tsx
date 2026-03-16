import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useLists, useDeleteList } from "@/hooks/use-lists";
import { CreateListDialog } from "./CreateListDialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { api } from "@shared/routes";
import { 
  LayoutDashboard, 
  List as ListIcon, 
  Trash2,
  TrendingUp,
  X,
  Pencil,
  Check
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface SidebarProps {
  onClose?: () => void;
  className?: string;
}

export function Sidebar({ onClose, className }: SidebarProps) {
  const [location] = useLocation();
  const { data: lists } = useLists();
  const deleteList = useDeleteList();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");

  const renameList = useMutation({
    mutationFn: async ({ id, name }: { id: number; name: string }) => {
      const res = await apiRequest("PATCH", `/api/lists/${id}`, { name });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.lists.list.path] });
      setEditingId(null);
      setEditingName("");
    }
  });

  const handleRenameSubmit = (id: number) => {
    if (editingName.trim().length === 0) return;
    renameList.mutate({ id, name: editingName.trim() });
  };

  const isAllStocks = location === "/" || location === "/stocks";

  return (
    <div className={cn(
      "w-64 border-r border-border bg-card flex flex-col h-screen",
      className
    )}>
      <div className="p-6 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-primary/20 p-2 rounded-lg">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <h1 className="font-bold text-lg tracking-tight">TradeVault</h1>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} className="md:hidden">
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      <div className="p-4">
        <Link href="/" onClick={onClose}>
          <div className={cn(
            "flex items-center gap-3 px-4 py-2.5 rounded-md text-sm font-medium transition-colors mb-6 cursor-pointer",
            isAllStocks 
              ? "bg-primary/10 text-primary" 
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}>
            <LayoutDashboard className="h-4 w-4" />
            All Stocks
          </div>
        </Link>

        <div className="flex items-center justify-between px-2 mb-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Your Lists
          </h2>
          <CreateListDialog />
        </div>

        <ScrollArea className="h-[calc(100vh-250px)]">
          <div className="space-y-1 px-1">
            {lists?.map((list) => {
              const isActive = location === `/lists/${list.id}`;
              const isEditing = editingId === list.id;

              return (
                <div 
                  key={list.id} 
                  className={cn(
                    "flex items-center rounded-md text-sm font-medium transition-colors",
                    isActive 
                      ? "bg-primary/10 text-primary" 
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  {isEditing ? (
                    <div className="flex items-center gap-1 px-1 py-1 w-full">
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRenameSubmit(list.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        className="h-6 text-xs flex-1 min-w-0"
                        autoFocus
                      />
                      <button
                        className="flex-shrink-0 p-1 rounded text-green-500 hover:text-green-400"
                        onClick={() => handleRenameSubmit(list.id)}
                      >
                        <Check className="h-3 w-3" />
                      </button>
                      <button
                        className="flex-shrink-0 p-1 rounded text-muted-foreground hover:text-foreground"
                        onClick={() => setEditingId(null)}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center w-full">
                      {/* List name */}
                      <Link 
                        href={`/lists/${list.id}`}
                        onClick={onClose}
                        className="flex items-center gap-2 px-2 py-2 flex-1 min-w-0 overflow-hidden"
                      >
                        <ListIcon className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="truncate text-xs">{list.name}</span>
                        {list.itemCount > 0 && (
                          <span className="flex-shrink-0 ml-1 text-xs bg-muted text-muted-foreground px-1 rounded-full">
                            {list.itemCount}
                          </span>
                        )}
                      </Link>

                      {/* ✅ Rename - blue color always visible */}
                      <button
                        className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded text-blue-400 hover:text-blue-300 hover:bg-muted"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setEditingId(list.id);
                          setEditingName(list.name);
                        }}
                        title="Rename list"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>

                      {/* ✅ Delete - red color always visible */}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button
                            className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded text-red-400 hover:text-red-300 hover:bg-muted mr-1"
                            onClick={(e) => e.stopPropagation()}
                            title="Delete list"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete list?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete "{list.name}". Stocks will NOT be deleted from other lists.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteList.mutate(list.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>
      
      <div className="mt-auto p-4 border-t border-border">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-primary to-blue-500" />
          <div className="text-sm">
            <p className="font-medium">Trader</p>
            <p className="text-xs text-muted-foreground">Pro Plan</p>
          </div>
        </div>
      </div>
    </div>
  );
}
