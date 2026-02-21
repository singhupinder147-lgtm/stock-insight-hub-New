import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useBulkCreateStocks } from "@/hooks/use-stocks";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";

// Local schema just for the form input string
const formSchema = z.object({
  symbolsInput: z.string().min(1, "Please enter at least one symbol"),
});

export function AddStockDialog() {
  const [open, setOpen] = useState(false);
  const bulkCreate = useBulkCreateStocks();
  
  const form = useForm<{ symbolsInput: string }>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      symbolsInput: "",
    },
  });

  const onSubmit = (data: { symbolsInput: string }) => {
    // Split by comma or newline, trim, filter empty
    const symbols = data.symbolsInput
      .split(/[\n,]+/)
      .map(s => s.trim().toUpperCase())
      .filter(s => s.length > 0);

    if (symbols.length === 0) return;

    bulkCreate.mutate({ symbols }, {
      onSuccess: () => {
        setOpen(false);
        form.reset();
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Stocks
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] bg-card border-border">
        <DialogHeader>
          <DialogTitle>Add Stocks to Master List</DialogTitle>
          <DialogDescription>
            Enter stock symbols separated by commas or new lines (e.g., RELIANCE, TCS, INFY).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="symbolsInput">Symbols</Label>
            <Textarea
              id="symbolsInput"
              className="min-h-[150px] font-mono"
              placeholder="NSE:RELIANCE&#10;NSE:TCS&#10;NSE:INFY"
              {...form.register("symbolsInput")}
            />
            {form.formState.errors.symbolsInput && (
              <p className="text-sm text-destructive">{form.formState.errors.symbolsInput.message}</p>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={bulkCreate.isPending}>
              {bulkCreate.isPending ? "Adding..." : "Add Stocks"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
