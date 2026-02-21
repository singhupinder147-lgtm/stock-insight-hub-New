import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Stock, StockList } from "@shared/schema";
import { useLists, useAddListItem, useRemoveListItem } from "@/hooks/use-lists";
import { useDeleteStock } from "@/hooks/use-stocks";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Plus, Trash2, ExternalLink } from "lucide-react";
import { format } from "date-fns";

interface StockTableProps {
  stocks: Stock[];
  currentListId?: number; // If present, we are in a list view
}

export function StockTable({ stocks, currentListId }: StockTableProps) {
  const { data: lists } = useLists();
  const deleteStock = useDeleteStock();
  const removeListItem = useRemoveListItem(currentListId || 0);

  // Helper component to add stock to a different list
  const AddToListMenuItem = ({ stockId }: { stockId: number }) => {
    // We can't use hooks inside a map efficiently if state is complex, 
    // but here we just need to trigger mutations.
    // However, react-query hooks must be at top level.
    // So we need a component that handles the mutation logic or pass handlers.
    // Let's create a small internal component for the menu logic.
    return <ListSubMenu stockId={stockId} availableLists={lists || []} />;
  };

  return (
    <div className="rounded-md border border-border bg-card overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow className="hover:bg-muted/50 border-border">
            <TableHead className="w-[150px]">Symbol</TableHead>
            <TableHead>Company Name</TableHead>
            <TableHead className="w-[150px]">Added Date</TableHead>
            <TableHead className="text-right w-[80px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {stocks.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                No stocks found. Add some to get started.
              </TableCell>
            </TableRow>
          ) : (
            stocks.map((stock) => (
              <TableRow key={stock.id} className="group border-border hover:bg-muted/30">
                <TableCell className="font-mono font-medium text-primary">
                  <Link href={currentListId ? `/lists/${currentListId}/stocks/${stock.id}` : `/stocks/${stock.id}`} className="hover:underline flex items-center gap-2">
                    {stock.symbol}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{stock.name || "—"}</TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {stock.addedAt ? format(new Date(stock.addedAt), 'MMM dd, yyyy') : "-"}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[160px]">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem asChild>
                        <Link href={currentListId ? `/lists/${currentListId}/stocks/${stock.id}` : `/stocks/${stock.id}`}>
                           <ExternalLink className="mr-2 h-4 w-4" /> View Details
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      
                      <AddToListMenuItem stockId={stock.id} />

                      {currentListId ? (
                        <DropdownMenuItem 
                          className="text-destructive focus:text-destructive"
                          onClick={() => removeListItem.mutate(stock.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Remove from List
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem 
                          className="text-destructive focus:text-destructive"
                          onClick={() => deleteStock.mutate(stock.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete Stock
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function ListSubMenu({ stockId, availableLists }: { stockId: number, availableLists: StockList[] }) {
  // We need to instantiate the hook for every list item? No, that's bad performance.
  // Instead, let's just use one generic mutation if possible or move this up.
  // But React Query hooks rule is top level.
  // Workaround: The mutation hook returns a function `mutate`.
  // The hook itself is cheap. Let's try creating a component wrapper.
  
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <Plus className="mr-2 h-4 w-4" /> Add to List
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="w-48">
        {availableLists.length === 0 ? (
          <DropdownMenuItem disabled>No lists created</DropdownMenuItem>
        ) : (
          availableLists.map(list => (
            <AddToListAction key={list.id} list={list} stockId={stockId} />
          ))
        )}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}

function AddToListAction({ list, stockId }: { list: StockList, stockId: number }) {
  const addToList = useAddListItem(list.id);
  return (
    <DropdownMenuItem onClick={() => addToList.mutate({ stockId })}>
      {list.name}
    </DropdownMenuItem>
  );
}
