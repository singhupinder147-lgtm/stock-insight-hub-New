import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useLists, useDeleteList } from "@/hooks/use-lists";
import { CreateListDialog } from "./CreateListDialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  LayoutDashboard, 
  List as ListIcon, 
  Trash2,
  TrendingUp,
  X
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

interface SidebarProps {
  onClose?: () => void;
  className?: string;
}

export function Sidebar({ onClose, className }: SidebarProps) {
  const [location] = useLocation();
  const { data: lists } = useLists();
  const deleteList = useDeleteList();

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
          <div className="space-y-1 px-2">
            {lists?.map((list) => {
              const isActive = location === `/lists/${list.id}`;
              return (
                <div 
                  key={list.id} 
                  className={cn(
                    "group flex items-center justify-between rounded-md text-sm font-medium transition-colors",
                    isActive 
                      ? "bg-primary/10 text-primary" 
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <Link 
                    href={`/lists/${list.id}`}
                    onClick={onClose}
                    className="flex items-center gap-3 px-4 py-2.5 flex-1 truncate"
                  >
                    <ListIcon className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{list.name}</span>
                    {list.itemCount > 0 && (
                      <span className="ml-auto text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
                        {list.itemCount}
                      </span>
                    )}
                  </Link>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive mr-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete list?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete the list "{list.name}". The stocks themselves will not be deleted from the master list.
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
