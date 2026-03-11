import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Option 1: Backend Screener.in fetch ─────────────────────────────────────
async function fetchFromBackend(symbol: string) {
  try {
    const res = await fetch(`/api/screener/${symbol.toUpperCase()}`);
    if (!res.ok) return null;
    const json = await res.json();
    if (json?.success && json?.data) return { source: "screener", data: json.data };
  } catch { }
  return null;
}

// ─── Option 2: Browser Yahoo Finance via CORS proxy ──────────────────────────
async function fetchFromYahoo(symbol: string) {
  const suffixes = [".NS", ".BO", ""];
  const modules = [
    "financialData","defaultKeyStatistics","summaryDetail",
    "incomeStatementHistory","incomeStatementHistoryQuarterly",
    "balanceSheetHistory","cashflowStatementHistory",
  ].join(",");

  const corsProxies = [
    (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
    (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    (url: string) => `https://thingproxy.freeboard.io/fetch/${url}`,
  ];

  for (const suffix of suffixes) {
    const sym = symbol.toUpperCase() + suffix;
    for (const base of ["https://query1.finance.yahoo.com", "https://query2.finance.yahoo.com"]) {
      const url = `${base}/v10/finance/quoteSummary/${sym}?modules=${modules}`;
      for (const makeProxy of corsProxies) {
        try {
          const res = await fetch(makeProxy(url), { headers: { Accept: "application/json" } });
          if (!res.ok) continue;
          const json = await res.json();
          const result = json?.quoteSummary?.result?.[0];
          if (result) return { source: "yahoo", data: result, symbol: sym };
        } catch { continue; }
      }
    }
  }
  return null;
}

// ─── Master fetch: tries all options ─────────────────────────────────────────
async function fetchFundamentals(symbol: string) {
  if (!symbol) return null;

  // Try Option 1: Backend Screener.in
  const backendData = await fetchFromBackend(symbol);
  if (backendData) {
    console.log("✅ Fundamentals loaded from Screener.in (backend)");
    return backendData;
  }

  // Try Option 2: Yahoo Finance via CORS proxy
  const yahooData = await fetchFromYahoo(symbol);
  if (yahooData) {
    console.log("✅ Fundamentals loaded from Yahoo Finance (browser)");
    return yahooData;
  }

  console.log("❌ All fundamentals sources failed for", symbol);
  return null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmt(val: any): string {
  if (val === null || val === undefined) return "N/A";
  if (typeof val === "object") {
    if (val.fmt) return val.fmt;
    if (val.raw !== undefined) return val.raw.toLocaleString("en-IN");
  }
  return String(val);
}

function pct(val: any): string {
  if (val === null || val === undefined) return "N/A";
  const raw = typeof val === "object" ? val.raw : val;
  if (raw === undefined || raw === null) return "N/A";
  return (raw * 100).toFixed(2) + "%";
}

function crore(val: any): string {
  if (val === null || val === undefined) return "N/A";
  const raw = typeof val === "object" ? val.raw : val;
  if (!raw) return "N/A";
  const cr = raw / 1e7;
  if (cr >= 1e5) return "₹" + (cr / 1e5).toFixed(2) + "L Cr";
  if (cr >= 1e3) return "₹" + (cr / 1e3).toFixed(2) + "K Cr";
  return "₹" + cr.toFixed(2) + " Cr";
}

function GreenRed({ value }: { value: string }) {
  if (value === "N/A") return <span className="text-muted-foreground">N/A</span>;
  const num = parseFloat(value);
  if (isNaN(num)) return <span>{value}</span>;
  return (
    <span className={`flex items-center gap-1 ${num >= 0 ? "text-green-500" : "text-red-500"}`}>
      {num >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {value}
    </span>
  );
}

function Row({ label, value, green }: { label: string; value: string; green?: boolean }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      {green ? <GreenRed value={value} /> : <span className="text-sm font-medium text-foreground">{value}</span>}
    </div>
  );
}

// ─── Screener.in data display ─────────────────────────────────────────────────
function ScreenerOverview({ data }: { data: any }) {
  const ratios = data?.ratios || data || {};
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Key Ratios</CardTitle></CardHeader>
        <CardContent>
          <Row label="Market Cap" value={ratios.marketCap ? `₹${Number(ratios.marketCap).toLocaleString("en-IN")} Cr` : "N/A"} />
          <Row label="P/E Ratio" value={ratios.pe ? String(ratios.pe) : "N/A"} />
          <Row label="Book Value" value={ratios.bookValue ? `₹${ratios.bookValue}` : "N/A"} />
          <Row label="Dividend Yield" value={ratios.dividendYield ? `${ratios.dividendYield}%` : "N/A"} />
          <Row label="Face Value" value={ratios.faceValue ? `₹${ratios.faceValue}` : "N/A"} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Profitability</CardTitle></CardHeader>
        <CardContent>
          <Row label="ROE" value={ratios.roe ? `${ratios.roe}%` : "N/A"} green />
          <Row label="ROCE" value={ratios.roce ? `${ratios.roce}%` : "N/A"} green />
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
interface FundamentalsViewerProps {
  data?: any;
  stockId: number;
  symbol: string;
}

export function FundamentalsViewer({ stockId, symbol }: FundamentalsViewerProps) {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["fundamentals", symbol],
    queryFn: () => fetchFundamentals(symbol),
    staleTime: 1000 * 60 * 60,
    enabled: !!symbol,
  });

  if (isLoading || isFetching) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Fundamentals</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Fundamentals</h2>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Retry
          </Button>
        </div>
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Could not load fundamental data for <strong>{symbol}</strong>.
            <br />
            <Button variant="link" onClick={() => refetch()} className="mt-2">Try again</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Screener.in data (simple display) ──
  if (data.source === "screener" || data.source === "screener-html") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Fundamentals</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-green-500">✅ Source: Screener.in</span>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
          </div>
        </div>
        <ScreenerOverview data={data.data} />
      </div>
    );
  }

  // ── Yahoo Finance data (full display) ──
  const d = data.data;
  const fin = d.financialData || {};
  const stats = d.defaultKeyStatistics || {};
  const summary = d.summaryDetail || {};
  const incomeY = d.incomeStatementHistory?.incomeStatementHistory || [];
  const incomeQ = d.incomeStatementHistoryQuarterly?.incomeStatementHistory || [];
  const balance = d.balanceSheetHistory?.balanceSheetStatements || [];
  const cashflow = d.cashflowStatementHistory?.cashflowStatements || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Fundamentals</h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Source: Yahoo Finance ({data.symbol})</span>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="income">Income</TabsTrigger>
          <TabsTrigger value="balance">Balance Sheet</TabsTrigger>
          <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Valuation</CardTitle></CardHeader>
              <CardContent>
                <Row label="Market Cap" value={crore(summary.marketCap)} />
                <Row label="P/E Ratio (TTM)" value={fmt(summary.trailingPE)} />
                <Row label="Forward P/E" value={fmt(summary.forwardPE)} />
                <Row label="P/B Ratio" value={fmt(stats.priceToBook)} />
                <Row label="EV/EBITDA" value={fmt(stats.enterpriseToEbitda)} />
                <Row label="Price to Sales" value={fmt(summary.priceToSalesTrailing12Months)} />
                <Row label="Enterprise Value" value={crore(stats.enterpriseValue)} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Profitability</CardTitle></CardHeader>
              <CardContent>
                <Row label="EPS (TTM)" value={fmt(stats.trailingEps)} />
                <Row label="ROE" value={pct(fin.returnOnEquity)} green />
                <Row label="ROA" value={pct(fin.returnOnAssets)} green />
                <Row label="Profit Margin" value={pct(fin.profitMargins)} green />
                <Row label="Operating Margin" value={pct(fin.operatingMargins)} green />
                <Row label="EBITDA" value={crore(fin.ebitda)} />
                <Row label="Gross Profits" value={crore(fin.grossProfits)} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Growth</CardTitle></CardHeader>
              <CardContent>
                <Row label="Revenue Growth (YoY)" value={pct(fin.revenueGrowth)} green />
                <Row label="Earnings Growth (YoY)" value={pct(fin.earningsGrowth)} green />
                <Row label="Earnings Growth (Q)" value={pct(fin.earningsQuarterlyGrowth)} green />
                <Row label="Total Revenue" value={crore(fin.totalRevenue)} />
                <Row label="Revenue Per Share" value={fmt(fin.revenuePerShare)} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Per Share & Dividends</CardTitle></CardHeader>
              <CardContent>
                <Row label="EPS (TTM)" value={fmt(stats.trailingEps)} />
                <Row label="Book Value/Share" value={fmt(stats.bookValue)} />
                <Row label="Dividend Rate" value={fmt(stats.dividendRate)} />
                <Row label="Dividend Yield" value={pct(stats.dividendYield)} />
                <Row label="Payout Ratio" value={pct(stats.payoutRatio)} />
                <Row label="Beta" value={fmt(summary.beta)} />
                <Row label="52W High" value={fmt(summary.fiftyTwoWeekHigh)} />
                <Row label="52W Low" value={fmt(summary.fiftyTwoWeekLow)} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Balance Sheet Summary</CardTitle></CardHeader>
              <CardContent>
                <Row label="Total Debt" value={crore(fin.totalDebt)} />
                <Row label="Total Cash" value={crore(fin.totalCash)} />
                <Row label="Debt/Equity" value={fmt(fin.debtToEquity)} />
                <Row label="Current Ratio" value={fmt(fin.currentRatio)} />
                <Row label="Quick Ratio" value={fmt(fin.quickRatio)} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Cash Flow Summary</CardTitle></CardHeader>
              <CardContent>
                <Row label="Free Cash Flow" value={crore(fin.freeCashflow)} />
                <Row label="Operating Cash Flow" value={crore(fin.operatingCashflow)} />
                <Row label="Cash/Share" value={fmt(fin.totalCashPerShare)} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* INCOME */}
        <TabsContent value="income" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Yearly Income Statement</CardTitle></CardHeader>
            <CardContent>
              {incomeY.length === 0 ? <p className="text-muted-foreground text-sm">No yearly data available.</p> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        <th className="text-left py-2">Period</th>
                        <th className="text-right py-2">Revenue</th>
                        <th className="text-right py-2">Gross Profit</th>
                        <th className="text-right py-2">Net Income</th>
                        <th className="text-right py-2">Operating Income</th>
                      </tr>
                    </thead>
                    <tbody>
                      {incomeY.map((item: any, i: number) => (
                        <tr key={i} className="border-b border-border/50 hover:bg-muted/20">
                          <td className="py-2 font-medium">{item.endDate?.fmt || "—"}</td>
                          <td className="text-right py-2">{crore(item.totalRevenue)}</td>
                          <td className="text-right py-2">{crore(item.grossProfit)}</td>
                          <td className={`text-right py-2 ${item.netIncome?.raw >= 0 ? "text-green-500" : "text-red-500"}`}>{crore(item.netIncome)}</td>
                          <td className="text-right py-2">{crore(item.operatingIncome)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Quarterly Income Statement</CardTitle></CardHeader>
            <CardContent>
              {incomeQ.length === 0 ? <p className="text-muted-foreground text-sm">No quarterly data available.</p> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        <th className="text-left py-2">Quarter</th>
                        <th className="text-right py-2">Revenue</th>
                        <th className="text-right py-2">Gross Profit</th>
                        <th className="text-right py-2">Net Income</th>
                        <th className="text-right py-2">Operating Income</th>
                      </tr>
                    </thead>
                    <tbody>
                      {incomeQ.map((item: any, i: number) => (
                        <tr key={i} className="border-b border-border/50 hover:bg-muted/20">
                          <td className="py-2 font-medium">{item.endDate?.fmt || "—"}</td>
                          <td className="text-right py-2">{crore(item.totalRevenue)}</td>
                          <td className="text-right py-2">{crore(item.grossProfit)}</td>
                          <td className={`text-right py-2 ${item.netIncome?.raw >= 0 ? "text-green-500" : "text-red-500"}`}>{crore(item.netIncome)}</td>
                          <td className="text-right py-2">{crore(item.operatingIncome)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* BALANCE SHEET */}
        <TabsContent value="balance" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Balance Sheet (Yearly)</CardTitle></CardHeader>
            <CardContent>
              {balance.length === 0 ? <p className="text-muted-foreground text-sm">No balance sheet data available.</p> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        <th className="text-left py-2">Period</th>
                        <th className="text-right py-2">Total Assets</th>
                        <th className="text-right py-2">Total Debt</th>
                        <th className="text-right py-2">Cash</th>
                        <th className="text-right py-2">Stockholder Equity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {balance.map((item: any, i: number) => (
                        <tr key={i} className="border-b border-border/50 hover:bg-muted/20">
                          <td className="py-2 font-medium">{item.endDate?.fmt || "—"}</td>
                          <td className="text-right py-2">{crore(item.totalAssets)}</td>
                          <td className="text-right py-2">{crore(item.totalDebt || item.longTermDebt)}</td>
                          <td className="text-right py-2">{crore(item.cash)}</td>
                          <td className="text-right py-2">{crore(item.totalStockholderEquity)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* CASH FLOW */}
        <TabsContent value="cashflow" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Cash Flow Statement (Yearly)</CardTitle></CardHeader>
            <CardContent>
              {cashflow.length === 0 ? <p className="text-muted-foreground text-sm">No cash flow data available.</p> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        <th className="text-left py-2">Period</th>
                        <th className="text-right py-2">Operating CF</th>
                        <th className="text-right py-2">Investing CF</th>
                        <th className="text-right py-2">Financing CF</th>
                        <th className="text-right py-2">CapEx</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cashflow.map((item: any, i: number) => (
                        <tr key={i} className="border-b border-border/50 hover:bg-muted/20">
                          <td className="py-2 font-medium">{item.endDate?.fmt || "—"}</td>
                          <td className={`text-right py-2 ${item.totalCashFromOperatingActivities?.raw >= 0 ? "text-green-500" : "text-red-500"}`}>{crore(item.totalCashFromOperatingActivities)}</td>
                          <td className={`text-right py-2 ${item.totalCashflowsFromInvestingActivities?.raw >= 0 ? "text-green-500" : "text-red-500"}`}>{crore(item.totalCashflowsFromInvestingActivities)}</td>
                          <td className={`text-right py-2 ${item.totalCashFromFinancingActivities?.raw >= 0 ? "text-green-500" : "text-red-500"}`}>{crore(item.totalCashFromFinancingActivities)}</td>
                          <td className="text-right py-2">{crore(item.capitalExpenditures)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
