import { useParams } from "wouter";
import { Sidebar } from "@/components/Sidebar";
import { useStocks } from "@/hooks/use-stocks";
import { useListItems, useLists } from "@/hooks/use-lists";
import { StockTable } from "@/components/StockTable";
import { AddStockDialog } from "@/components/AddStockDialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Menu } from "lucide-react";
import { useState, useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export default function Dashboard() {
  const params = useParams<{ id?: string }>();
  const listId = params.id ? parseInt(params.id) : undefined;
  
  const [search, setSearch] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Determine what to fetch
  const { data: allStocks, isLoading: loadingAll } = useStocks();
  const { data: listItems, isLoading: loadingList } = useListItems(listId || 0);
  const { data: lists } = useLists();

  const activeList = listId ? lists?.find(l => l.id === listId) : null;
  const currentStocks = listId ? listItems : allStocks;
  const isLoading = listId ? loadingList : loadingAll;

  // Client-side search filtering
  const filteredStocks = useMemo(() => {
    if (!currentStocks) return [];
    if (!search) return currentStocks;
    const lowerSearch = search.toLowerCase();
    return currentStocks.filter(s => 
      s.symbol.toLowerCase().includes(lowerSearch) || 
      (s.name && s.name.toLowerCase().includes(lowerSearch))
    );
  }, [currentStocks, search]);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <div className="hidden md:block fixed left-0 top-0 h-screen z-20">
        <Sidebar />
      </div>
      
      <main className="flex-1 md:ml-64 p-4 md:p-8">
        <div className="max-w-6xl mx-auto space-y-6 md:space-y-8 animate-in">
          
          {/* Mobile Header */}
          <div className="flex md:hidden items-center justify-between mb-4">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-64">
                <Sidebar onClose={() => setIsMobileMenuOpen(false)} />
              </SheetContent>
            </Sheet>
            <h1 className="font-bold text-lg">TradeVault</h1>
            <div className="w-10" /> {/* Spacer */}
          </div>

          {/* Header Section */}
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                {activeList ? activeList.name : "All Stocks"}
              </h1>
              <p className="text-sm md:text-base text-muted-foreground mt-1">
                {activeList 
                  ? activeList.description || "Manage your curated list of stocks"
                  : "Overview of all tracked instruments"}
              </p>
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
              {!listId && <AddStockDialog />}
            </div>
          </div>

          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 bg-card p-3 md:p-4 rounded-lg border border-border shadow-sm">
            <div className="relative flex-1 max-w-full md:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search symbol or name..." 
                className="pl-9 bg-background border-border"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="text-sm text-muted-foreground sm:ml-auto">
              {filteredStocks.length} Results
            </div>
          </div>

          {/* Content */}
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full bg-card/50" />
                ))}
              </div>
            ) : (
              <StockTable stocks={filteredStocks} currentListId={listId} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
