import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import https from "https";

// ✅ Safe fetch function that works on all Node.js versions
function safeFetch(url: string, headers: Record<string, string> = {}): Promise<{ ok: boolean; json: () => Promise<any>; text: () => Promise<string>; headers: { get: (h: string) => string | null } }> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json, text/html, */*",
        ...headers,
      },
    };
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        resolve({
          ok: (res.statusCode || 0) >= 200 && (res.statusCode || 0) < 300,
          json: () => Promise.resolve(JSON.parse(data)),
          text: () => Promise.resolve(data),
          headers: { get: (h: string) => res.headers[h.toLowerCase()] as string || null },
        });
      });
    });
    req.on("error", reject);
    req.end();
  });
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // === STOCKS ===
  
  app.get(api.stocks.list.path, async (req, res) => {
    const stocks = await storage.getAllStocks();
    res.json(stocks);
  });

  app.get(api.stocks.search.path, async (req, res) => {
    const query = req.query.query as string;
    if (!query) return res.json([]);
    const stocks = await storage.searchStocks(query);
    res.json(stocks);
  });

  app.get(api.stocks.get.path, async (req, res) => {
    const id = Number(req.params.id);
    const stock = await storage.getStock(id);
    if (!stock) {
      return res.status(404).json({ message: 'Stock not found' });
    }
    const fund = await storage.getFundamentals(id);
    res.json({ ...stock, fundamentals: fund || null });
  });

  app.post(api.stocks.bulkCreate.path, async (req, res) => {
    try {
      const { symbols } = api.stocks.bulkCreate.input.parse(req.body);
      const count = await storage.bulkCreateStocks(symbols);
      res.status(201).json({ count });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.delete(api.stocks.delete.path, async (req, res) => {
    await storage.deleteStock(Number(req.params.id));
    res.status(204).send();
  });

  // === LISTS ===

  app.get(api.lists.list.path, async (req, res) => {
    const lists = await storage.getLists();
    res.json(lists);
  });

  app.post(api.lists.create.path, async (req, res) => {
    try {
      const input = api.lists.create.input.parse(req.body);
      const list = await storage.createList(input);
      res.status(201).json(list);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.delete(api.lists.delete.path, async (req, res) => {
    await storage.deleteList(Number(req.params.id));
    res.status(204).send();
  });

  app.get(api.lists.getItems.path, async (req, res) => {
    const items = await storage.getListItems(Number(req.params.id));
    res.json(items);
  });

  app.post(api.lists.addItem.path, async (req, res) => {
    try {
      const listId = Number(req.params.id);
      const { stockId } = api.lists.addItem.input.parse(req.body);
      const item = await storage.addListItem({ listId, stockId });
      res.status(201).json(item);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.delete(api.lists.removeItem.path, async (req, res) => {
    const listId = Number(req.params.id);
    const stockId = Number(req.params.stockId);
    await storage.removeListItem(listId, stockId);
    res.status(204).send();
  });

  // ✅ Clear all stocks from a list
  app.delete("/api/lists/:id/items/all", async (req, res) => {
    const listId = Number(req.params.id);
    await storage.clearListItems(listId);
    res.status(204).send();
  });

  // ✅ NEWS
  app.get("/api/news", async (req, res) => {
    try {
      const news = [
        { id: 1, title: "Market Update: Nifty hits record high as banks rally", source: "TradeNews", time: "2h ago", url: "#" },
        { id: 2, title: "Fed meeting outcome: What traders need to know today", source: "GlobalFinance", time: "4h ago", url: "#" },
        { id: 3, title: "Top 5 stocks to watch for swing trading this week", source: "InvestInsight", time: "5h ago", url: "#" },
        { id: 4, title: "Reliance Industries reports strong quarterly earnings", source: "BusinessDaily", time: "6h ago", url: "#" },
        { id: 5, title: "FII activity surges in IT sector stocks", source: "MarketWatch", time: "8h ago", url: "#" },
      ];
      res.json(news);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch news" });
    }
  });

  // ✅ SCREENER.IN FUNDAMENTALS
  app.get("/api/screener/:symbol", async (req, res) => {
    const symbol = req.params.symbol.toUpperCase();
    const urls = [
      `https://www.screener.in/api/company/${symbol}/consolidated/`,
      `https://www.screener.in/api/company/${symbol}/`,
    ];

    for (const url of urls) {
      try {
        const response = await safeFetch(url);
        if (!response.ok) continue;
        const contentType = response.headers.get("content-type") || "";

        if (contentType.includes("application/json")) {
          const data = await response.json();
          return res.json({ success: true, source: "screener", data });
        }

        if (contentType.includes("text/html")) {
          const html = await response.text();
          const extractNumber = (pattern: RegExp) => {
            const match = html.match(pattern);
            return match ? parseFloat(match[1].replace(/,/g, "")) : null;
          };
          const parsed = {
            marketCap: extractNumber(/Market Cap[^₹]*₹\s*([\d,]+)/),
            pe: extractNumber(/Stock P\/E[^0-9]*([\d.]+)/),
            bookValue: extractNumber(/Book Value[^₹]*₹\s*([\d.]+)/),
            dividendYield: extractNumber(/Dividend Yield[^0-9]*([\d.]+)/),
            roce: extractNumber(/ROCE[^0-9]*([\d.]+)/),
            roe: extractNumber(/ROE[^0-9]*([\d.]+)/),
            faceValue: extractNumber(/Face Value[^₹]*₹\s*([\d.]+)/),
          };
          if (parsed.pe || parsed.roe || parsed.roce) {
            return res.json({ success: true, source: "screener-html", data: parsed });
          }
        }
      } catch (err) {
        continue;
      }
    }

    return res.status(404).json({ 
      success: false, 
      message: `Could not fetch data for ${symbol} from Screener.in` 
    });
  });

  // === SEED DATA ===
  await seedDatabase();

  app.get("/api/stocks/:id/fundamentals", async (req, res) => {
    const id = Number(req.params.id);
    const fund = await storage.getFundamentals(id);
    if (!fund) return res.json(null);
    res.json(fund);
  });

  return httpServer;
}

async function seedDatabase() {
  const existingStocks = await storage.getAllStocks();
  if (existingStocks.length > 0) {
    const reliance = existingStocks.find(s => s.symbol === "RELIANCE");
    if (reliance) {
      const fund = await storage.getFundamentals(reliance.id);
      if (!fund) {
        await storage.createFundamentals({
          stockId: reliance.id,
          shareholding: { promoter: 50.3, fii: 22.1, dii: 15.5, public: 12.1 },
          quarterlyResults: [
            { quarter: "Dec 2023", sales: 225000, profit: 17000 },
            { quarter: "Mar 2024", sales: 235000, profit: 18000 },
            { quarter: "Jun 2024", sales: 230000, profit: 16500 },
            { quarter: "Sep 2024", sales: 240000, profit: 19000 },
            { quarter: "Dec 2024", sales: 250000, profit: 20500 },
            { quarter: "Mar 2025", sales: 265000, profit: 22000 },
          ],
          profitLoss: [
            { year: "2021", sales: 500000, netProfit: 50000 },
            { year: "2022", sales: 650000, netProfit: 60000 },
            { year: "2023", sales: 850000, netProfit: 75000 },
            { year: "2024", sales: 950000, netProfit: 85000 },
            { year: "2025 (Est)", sales: 1100000, netProfit: 105000 },
            { year: "2026 (Proj)", sales: 1300000, netProfit: 125000 },
          ]
        });
      }
    }
    return;
  }

  console.log("Seeding database...");
  const initialSymbols = ["RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK", "SBIN", "BHARTIARTL", "ITC", "KOTAKBANK", "LICI"];
  await storage.bulkCreateStocks(initialSymbols);

  const favorites = await storage.createList({ name: "Favorites", description: "My top picks" });
  const swing = await storage.createList({ name: "Swing Trading", description: "Short term opportunities" });

  const stocks = await storage.getAllStocks();
  const reliance = stocks.find(s => s.symbol === "RELIANCE");
  const tcs = stocks.find(s => s.symbol === "TCS");
  
  if (reliance && tcs) {
    await storage.addListItem({ listId: favorites.id, stockId: reliance.id });
    await storage.addListItem({ listId: favorites.id, stockId: tcs.id });
    await storage.addListItem({ listId: swing.id, stockId: reliance.id });
  }

  if (reliance) {
    await storage.createFundamentals({
      stockId: reliance.id,
      shareholding: { promoter: 50.3, fii: 22.1, dii: 15.5, public: 12.1 },
      quarterlyResults: [
        { quarter: "Dec 2023", sales: 225000, profit: 17000 },
        { quarter: "Mar 2024", sales: 235000, profit: 18000 },
        { quarter: "Jun 2024", sales: 230000, profit: 16500 },
        { quarter: "Sep 2024", sales: 240000, profit: 19000 },
        { quarter: "Dec 2024", sales: 250000, profit: 20500 },
        { quarter: "Mar 2025", sales: 265000, profit: 22000 },
      ],
      profitLoss: [
        { year: "2021", sales: 500000, netProfit: 50000 },
        { year: "2022", sales: 650000, netProfit: 60000 },
        { year: "2023", sales: 850000, netProfit: 75000 },
        { year: "2024", sales: 950000, netProfit: 85000 },
        { year: "2025 (Est)", sales: 1100000, netProfit: 105000 },
        { year: "2026 (Proj)", sales: 1300000, netProfit: 125000 },
      ]
    });
  }

  console.log("Seeding completed.");
}
