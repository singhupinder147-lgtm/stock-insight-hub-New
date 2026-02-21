import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Calculator } from "lucide-react";

const calculatorSchema = z.object({
  capital: z.coerce.number().min(0),
  riskPercent: z.coerce.number().min(0.1).max(100),
  entryPrice: z.coerce.number().min(0),
  stopLoss: z.coerce.number().min(0),
  target: z.coerce.number().optional(),
});

type CalculatorInputs = z.infer<typeof calculatorSchema>;

export function RiskCalculator() {
  const [results, setResults] = useState<{
    riskAmount: number;
    positionSize: number;
    capitalRequired: number;
    riskReward?: number;
  } | null>(null);

  const form = useForm<CalculatorInputs>({
    resolver: zodResolver(calculatorSchema),
    defaultValues: {
      capital: 50000,
      riskPercent: 1,
      entryPrice: 0,
      stopLoss: 0,
    },
    mode: "onChange" 
  });

  const values = form.watch();

  useEffect(() => {
    const { capital, riskPercent, entryPrice, stopLoss, target } = values;

    if (entryPrice > 0 && stopLoss > 0 && entryPrice !== stopLoss) {
      const riskPerShare = Math.abs(entryPrice - stopLoss);
      const totalRiskAmount = (capital * riskPercent) / 100;
      const quantity = Math.floor(totalRiskAmount / riskPerShare);
      const capitalRequired = quantity * entryPrice;
      
      let riskReward = undefined;
      if (target && target > 0) {
        const rewardPerShare = Math.abs(target - entryPrice);
        riskReward = rewardPerShare / riskPerShare;
      }

      setResults({
        riskAmount: totalRiskAmount,
        positionSize: quantity,
        capitalRequired,
        riskReward
      });
    } else {
      setResults(null);
    }
  }, [JSON.stringify(values)]);

  return (
    <Card className="bg-secondary/30 border-border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-medium text-foreground/90">
          <Calculator className="h-4 w-4 text-primary" />
          Risk Calculator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Capital</Label>
            <Input 
              {...form.register("capital")} 
              type="number" 
              className="h-8 bg-background border-border" 
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Risk %</Label>
            <Input 
              {...form.register("riskPercent")} 
              type="number" 
              step="0.1"
              className="h-8 bg-background border-border" 
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Entry</Label>
            <Input 
              {...form.register("entryPrice")} 
              type="number" 
              className="h-8 bg-background border-border text-blue-400" 
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Stop Loss</Label>
            <Input 
              {...form.register("stopLoss")} 
              type="number" 
              className="h-8 bg-background border-border text-red-400" 
            />
          </div>
          <div className="col-span-2 space-y-2">
             <Label className="text-xs text-muted-foreground">Target (Optional)</Label>
            <Input 
              {...form.register("target")} 
              type="number" 
              className="h-8 bg-background border-border text-green-400" 
            />
          </div>
        </div>

        <Separator className="bg-border/50" />

        <div className="grid grid-cols-2 gap-y-4 gap-x-2">
          <div>
            <p className="text-xs text-muted-foreground">Risk Amount</p>
            <p className="text-lg font-mono font-bold text-red-400">
              {results ? results.riskAmount.toLocaleString() : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Position Size</p>
            <p className="text-lg font-mono font-bold text-primary">
              {results ? results.positionSize.toLocaleString() : "—"} <span className="text-xs text-muted-foreground font-sans font-normal">Qty</span>
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Capital Reqd</p>
            <p className="text-sm font-mono text-foreground">
              {results ? results.capitalRequired.toLocaleString() : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Risk:Reward</p>
            <p className="text-sm font-mono text-foreground">
              {results?.riskReward ? `1:${results.riskReward.toFixed(2)}` : "—"}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
