import { useParams, useLocation } from "wouter";
import { Sidebar } from "@/components/Sidebar";
import { useStocks, useStock, useDeleteStock } from "@/hooks/use-stocks";
import { useLists, useAddListItem, useRemoveListItem } from "@/hooks/use-lists";
import { api, buildUrl } from "@shared/routes";
import { RiskCalculator } from "@/components/RiskCalculator";
import { FundamentalsViewer } from "@/components/Fundamentals";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ArrowLeft, 
  ExternalLink, 
  Trash2,
  Plus,
  Search,
  Newspaper,
  X,
  Menu,
  Trash
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export default function StockDetail() {
  const { id, listId } = useParams<{ id: string, listId?: string }>();
  const [_, setLocation] = useLocation();
  const stockId = parseInt(id || "0");
  const currentListId = listId ? parseInt(listId) : null;
  const [search, setSearch] = useState("");
  const [newSymbols, setNewSymbols] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);

  const bulkCreate = useMutation({
    mutationFn: async (symbols: string[]) => {
      const res = await apiRequest("POST", "/api/stocks/bulk", { symbols });
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/stocks"] });
      if (currentListId) {
        await queryClient.invalidateQueries({ queryKey: [`/api/lists/${currentListId}/items`] });
      }
      setNewSymbols("");
    }
  });

  const clearList = useMutation({
    mutationFn: async () => {
      await fetch(`/api/lists/${currentListId}/items/all`, { method: "DELETE" });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [`/api/lists/${currentListId}/items`] });
      await queryClient.invalidateQueries({ queryKey: ["/api/lists"] });
      setLocation(`/lists/${currentListId}`);
    }
  });

  const handleAddStocks = async () => {
    const symbols = newSymbols.split(/[\s,]+/).filter(s => s.trim().length > 0);
    if (symbols.length === 0) return;
    bulkCreate.mutate(symbols, {
      onSuccess: async (data: { count: number }) => {
        if (currentListId) {
          const res = await fetch("/api/stocks");
          const allStocks = await res.json();
          const newlyAdded = allStocks.filter((s: any) => 
            symbols.map(sym => sym.toUpperCase()).includes(s.symbol)
          );
          for (const s of newlyAdded) {
            await addListItem.mutateAsync({ stockId: s.id });
          }
          await queryClient.invalidateQueries({ queryKey: [`/api/lists/${currentListId}/items`] });
        }
      }
    });
  };
  
  const { data: stock, isLoading } = useStock(stockId);
  const { data: allStocks } = useStocks();

  const [price, setPrice] = useState<number | null>(null);
  const [change, setChange] = useState<number | null>(null);

  useEffect(() => {
    if (stock) {
      const basePrice = 1000 + (stock.id * 50);
      setPrice(basePrice);
      setChange(0);
      const interval = setInterval(() => {
        setPrice(prev => {
          if (!prev) return basePrice;
          const fluctuation = (Math.random() - 0.5) * 10;
          const nextPrice = prev + fluctuation;
          setChange(((nextPrice - basePrice) / basePrice) * 100);
          return nextPrice;
        });
      }, 60000);
      return () => clearInterval(interval);
    }
  }, [stock]);

  const { data: listItems } = useQuery({
    queryKey: [currentListId ? api.lists.getItems.path : "/api/stocks", currentListId],
    enabled: !!(currentListId || allStocks),
    queryFn: async () => {
      const url = currentListId ? buildUrl(api.lists.getItems.path, { id: currentListId }) : "/api/stocks";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch stocks");
      return res.json();
    }
  });

  const { data: lists } = useLists();
  const deleteStock = useDeleteStock();
  const addListItem = useAddListItem(currentListId || 0);
  const removeListItem = useRemoveListItem(currentListId || 0);

  const { data: news, isLoading: newsLoading } = useQuery({
    queryKey: ["/api/news"],
    queryFn: async () => {
      const res = await fetch("/api/news");
      if (!res.ok) throw new Error("Failed to fetch news");
      return res.json();
    }
  });

  const displayStocks = (listItems || allStocks || []) as any[];
  const filteredStocks = displayStocks.filter(s => 
    s.symbol.toLowerCase().includes(search.toLowerCase()) ||
    s.name?.toLowerCase().includes(search.toLowerCase())
  );
  
  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this stock?")) {
      deleteStock.mutate(stockId, {
        onSuccess: () => setLocation("/")
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-background text-foreground">
        <Sidebar className="hidden md:flex" />
        <main className="flex-1 md:ml-64 p-4 md:p-8 flex items-center justify-center">
          <div className="w-full max-w-5xl space-y-6">
            <Skeleton className="h-20 w-full" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Skeleton className="md:col-span-2 h-96" />
              <Skeleton className="md:col-span-1 h-96" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!stock) {
    return (
      <div className="flex min-h-screen bg-background text-foreground">
        <Sidebar className="hidden md:flex" />
        <main className="flex-1 md:ml-64 p-8 flex flex-col items-center justify-center">
           <h2 className="text-2xl font-bold mb-4">Stock not found</h2>
           <Button onClick={() => setLocation("/")}>Go Back</Button>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <div className="hidden md:block fixed left-0 top-0 h-screen z-20">
        <Sidebar />
      </div>
      
      <div className="flex-1 flex overflow-hidden md:ml-64 md:mr-80">
        <main className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
          <div className="max-w-4xl mx-auto space-y-6 md:space-y-8 animate-in">
            
            {/* Mobile Header */}
            <div className="flex md:hidden items-center justify-between">
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
              <Sheet open={isRightSidebarOpen} onOpenChange={setIsRightSidebarOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Search className="h-4 w-4" /> Stocks
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="p-0 w-80">
                  <StockListSidebar 
                    search={search} setSearch={setSearch}
                    newSymbols={newSymbols} setNewSymbols={setNewSymbols}
                    handleAddStocks={handleAddStocks}
                    isBulkPending={bulkCreate.isPending}
                    filteredStocks={filteredStocks}
                    currentListId={currentListId} stockId={stockId}
                    setLocation={setLocation} removeListItem={removeListItem}
                    clearList={clearList}
                    onClose={() => setIsRightSidebarOpen(false)}
                  />
                </SheetContent>
              </Sheet>
            </div>

            {/* Back */}
            <button 
              onClick={() => window.history.back()}
              className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </button>

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-border pb-6">
              <div className="w-full">
                <div className="flex flex-wrap items-baseline gap-3">
                  <h1 className="text-3xl md:text-4xl font-bold tracking-tighter text-foreground">{stock.symbol}</h1>
                  <span className="text-lg md:text-xl text-muted-foreground font-light">{stock.name}</span>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  {price && (
                    <>
                      <span className="text-xl md:text-2xl font-bold text-foreground">
                        ₹{price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className={`text-sm font-medium ${change && change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {change && change >= 0 ? '+' : ''}{change?.toFixed(2)}%
                      </span>
                    </>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground ring-1 ring-inset ring-gray-500/10">
                    Stock
                  </span>
                  <span className="text-xs text-muted-foreground">Added on {new Date(stock.addedAt || "").toLocaleDateString()}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <Button 
                  variant="outline" size="sm"
                  className="flex-1 md:flex-none gap-2 border-primary/50 text-primary hover:bg-primary/10 hover:text-primary"
                  onClick={() => window.open(`https://www.tradingview.com/chart/?symbol=NSE:${stock.symbol}`, 'tradingview_window')}
                >
                  TV <ExternalLink className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" size="sm"
                  className="flex-1 md:flex-none gap-2 border-orange-500/50 text-orange-500 hover:bg-orange-500/10 hover:text-orange-500"
                  onClick={() => window.open(`https://www.screener.in/company/${stock.symbol}/`, 'screener_window')}
                >
                  Screener <ExternalLink className="h-4 w-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="secondary" size="sm" className="flex-1 md:flex-none">Actions</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <Plus className="mr-2 h-4 w-4" /> Add to List
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        {lists?.map(list => (
                          <AddToListAction key={list.id} list={list} stockId={stock.id} />
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                    <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" /> Delete Stock
                    </DropdownMenuItem>
                    {currentListId && (
                      <DropdownMenuItem 
                        onClick={() => {
                          if (confirm("Remove this stock from the current list?")) {
                            removeListItem.mutate(stockId);
                            setLocation(`/lists/${currentListId}`);
                          }
                        }}
                        className="text-destructive focus:text-destructive"
                      >
                        <X className="mr-2 h-4 w-4" /> Remove from List
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* News Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Newspaper className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-bold">Latest Trading News</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {newsLoading ? (
                  Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
                ) : (
                  news?.map((item: any) => (
                    <Card key={item.id} className="hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => window.open(item.url, '_blank')}>
                      <CardContent className="p-4">
                        <h3 className="text-sm font-medium line-clamp-2">{item.title}</h3>
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          <span>{item.source}</span>
                          <span>•</span>
                          <span>{item.time}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>

            {/* Fundamentals */}
            <div className="space-y-6 overflow-hidden">
              <FundamentalsViewer data={stock.fundamentals} stockId={stock.id} symbol={stock.symbol} />
            </div>

            {/* Risk Calculator */}
            <div className="pt-8 border-t border-border">
              <div className="max-w-xl mx-auto">
                <RiskCalculator />
              </div>
            </div>
            
          </div>
        </main>

        {/* Desktop Right Sidebar */}
        <aside className="hidden md:flex w-80 border-l border-border bg-card flex-col fixed right-0 top-0 h-screen z-10">
          <StockListSidebar 
            search={search} setSearch={setSearch}
            newSymbols={newSymbols} setNewSymbols={setNewSymbols}
            handleAddStocks={handleAddStocks}
            isBulkPending={bulkCreate.isPending}
            filteredStocks={filteredStocks}
            currentListId={currentListId} stockId={stockId}
            setLocation={setLocation} removeListItem={removeListItem}
            clearList={clearList}
          />
        </aside>
      </div>
    </div>
  );
}

interface StockListSidebarProps {
  search: string;
  setSearch: (v: string) => void;
  newSymbols: string;
  setNewSymbols: (v: string) => void;
  handleAddStocks: () => void;
  isBulkPending: boolean;
  filteredStocks: any[];
  currentListId: number | null;
  stockId: number;
  setLocation: (v: string) => void;
  removeListItem: any;
  clearList: any;
  onClose?: () => void;
}

function StockListSidebar({ 
  search, setSearch, newSymbols, setNewSymbols, 
  handleAddStocks, isBulkPending, filteredStocks, 
  currentListId, stockId, setLocation, removeListItem,
  clearList, onClose
}: StockListSidebarProps) {

  // ✅ Auto scroll active stock into view
  const activeRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [stockId]);

  return (
    <>
      <div className="p-4 border-b border-border space-y-4">
        <div className="flex items-center justify-between md:hidden">
          <h2 className="font-bold">Stock List</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search stocks..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Add symbols..."
            value={newSymbols}
            onChange={(e) => setNewSymbols(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddStocks()}
            className="text-xs"
          />
          <Button size="icon" onClick={handleAddStocks} disabled={isBulkPending}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {currentListId && (
          <Button
            variant="destructive" size="sm" className="w-full gap-2"
            onClick={() => {
              if (confirm("Remove ALL stocks from this list? This will NOT delete the stocks from other lists.")) {
                clearList.mutate();
              }
            }}
            disabled={clearList.isPending}
          >
            <Trash className="h-4 w-4" />
            {clearList.isPending ? "Clearing..." : "Clear All Stocks"}
          </Button>
        )}
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {filteredStocks.map((s) => (
            <div
              key={s.id}
              ref={s.id === stockId ? activeRef : null}
              className={`group w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center justify-between ${
                s.id === stockId 
                  ? "bg-primary text-primary-foreground font-medium" 
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <button 
                onClick={() => {
                  setLocation(currentListId ? `/lists/${currentListId}/stocks/${s.id}` : `/stocks/${s.id}`);
                  if (onClose) onClose();
                }}
                className="flex-1 truncate text-left"
              >
                {s.symbol}
              </button>
              <div className="flex items-center gap-1">
                {s.id === stockId && <div className="h-1.5 w-1.5 rounded-full bg-primary-foreground mr-1" />}
                {currentListId && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Remove ${s.symbol} from this list?`)) {
                        removeListItem.mutate(s.id);
                        if (s.id === stockId) setLocation(`/lists/${currentListId}`);
                      }
                    }}
                    className={`opacity-0 group-hover:opacity-100 p-0.5 rounded-sm transition-opacity ${
                      s.id === stockId ? "hover:bg-primary-foreground/20" : "hover:bg-background"
                    }`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </>
  );
}

function AddToListAction({ list, stockId }: { list: any, stockId: number }) {
  const addToList = useAddListItem(list.id);
  return (
    <DropdownMenuItem onClick={() => addToList.mutate({ stockId })}>
      {list.name}
    </DropdownMenuItem>
  );
}
