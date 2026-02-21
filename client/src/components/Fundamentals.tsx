import { Fundamentals } from "@shared/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface FundamentalsProps {
  data?: Fundamentals | null;
}

export function FundamentalsViewer({ data }: FundamentalsProps) {
  const [showShareholding, setShowShareholding] = useState(true);
  const [showQuarterly, setShowQuarterly] = useState(true);
  const [showPnL, setShowPnL] = useState(true);

  if (!data) {
    return (
      <div className="text-center p-8 border border-dashed border-border rounded-lg text-muted-foreground">
        No fundamental data available for this stock.
      </div>
    );
  }

  // Parse JSONB data safely
  const shareholding = (data.shareholding as Record<string, number>) || {};
  const quarterly = (data.quarterlyResults as Record<string, any>[]) || [];
  const profitLoss = (data.profitLoss as Record<string, any>[]) || [];

  return (
    <div className="space-y-6">
      <Collapsible open={showShareholding} onOpenChange={setShowShareholding} className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Shareholding Pattern</h2>
          <CollapsibleTrigger asChild>
            <button className="p-2 hover:bg-muted rounded-md transition-colors">
              {showShareholding ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent>
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Holding %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(shareholding).length > 0 ? (
                    Object.entries(shareholding).map(([category, value]) => (
                      <TableRow key={category} className="border-border hover:bg-muted/30">
                        <TableCell className="font-medium">{category}</TableCell>
                        <TableCell className="text-right font-mono">{Number(value).toFixed(2)}%</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-muted-foreground">No data</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      <Collapsible open={showQuarterly} onOpenChange={setShowQuarterly} className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Quarterly Results</h2>
          <CollapsibleTrigger asChild>
            <button className="p-2 hover:bg-muted rounded-md transition-colors">
              {showQuarterly ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent>
          <Card className="bg-card border-border overflow-hidden">
            <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-muted-foreground/20">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="w-[180px] sticky left-0 bg-card z-20 border-r border-border">Metric</TableHead>
                    {quarterly.map((q, i) => (
                      <TableHead key={i} className="text-right min-w-[120px]">{q.quarter || q.period}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quarterly.length > 0 ? (
                    ['sales', 'expenses', 'profit', 'opm', 'otherIncome', 'interest', 'depreciation', 'pbt', 'tax', 'netProfit', 'eps'].map(metric => {
                      const label = metric.charAt(0).toUpperCase() + metric.slice(1).replace(/([A-Z])/g, ' $1');
                      const hasData = quarterly.some(q => q[metric] !== undefined);
                      if (!hasData) return null;

                      return (
                        <TableRow key={metric} className="border-border hover:bg-muted/30">
                          <TableCell className="font-medium sticky left-0 bg-card z-10 border-r border-border">{label}</TableCell>
                          {quarterly.map((q, i) => (
                            <TableCell key={i} className="text-right font-mono text-muted-foreground">
                              {q[metric] !== undefined ? (typeof q[metric] === 'number' ? q[metric].toLocaleString() : q[metric]) : '-'}
                              {metric === 'opm' || metric === 'tax' ? '%' : ''}
                            </TableCell>
                          ))}
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow><TableCell colSpan={5} className="text-center">No quarterly data</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      <Collapsible open={showPnL} onOpenChange={setShowPnL} className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Profit & Loss Statement</h2>
          <CollapsibleTrigger asChild>
            <button className="p-2 hover:bg-muted rounded-md transition-colors">
              {showPnL ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent>
          <Card className="bg-card border-border overflow-hidden">
            <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-muted-foreground/20">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="w-[180px] sticky left-0 bg-card z-20 border-r border-border">Metric</TableHead>
                    {profitLoss.map((y, i) => (
                      <TableHead key={i} className="text-right min-w-[120px]">{y.year || y.period}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profitLoss.length > 0 ? (
                    ['sales', 'expenses', 'operatingProfit', 'opm', 'netProfit', 'eps'].map(metric => {
                      const label = metric.charAt(0).toUpperCase() + metric.slice(1).replace(/([A-Z])/g, ' $1');
                      const hasData = profitLoss.some(y => y[metric] !== undefined);
                      if (!hasData) return null;

                      return (
                        <TableRow key={metric} className="border-border hover:bg-muted/30">
                          <TableCell className="font-medium sticky left-0 bg-card z-10 border-r border-border">{label}</TableCell>
                          {profitLoss.map((y, i) => (
                            <TableCell key={i} className="text-right font-mono text-muted-foreground">
                              {y[metric] !== undefined ? (typeof y[metric] === 'number' ? y[metric].toLocaleString() : y[metric]) : '-'}
                              {metric === 'opm' ? '%' : ''}
                            </TableCell>
                          ))}
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow><TableCell colSpan={5} className="text-center">No P&L data</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
