import * as https from "https";
import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

/* SAFE FETCH FOR NODE */
function safeFetch(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      { headers: { "User-Agent": "Mozilla/5.0" } },
      (res) => {
        let data: string = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          resolve({
            ok: (res.statusCode || 0) >= 200 && (res.statusCode || 0) < 300,
            text: async () => data,
            headers: {
              get: (h: string) =>
                String(res.headers[h.toLowerCase()] || ""),
            },
          });
        });
      }
    );

    req.on("error", reject);
  });
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  /* === STOCKS === */

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
      return res.status(404).json({ message: "Stock not found" });
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
          field: err.errors[0].path.join("."),
        });
      }

      throw err;
    }
  });

  app.delete(api.stocks.delete.path, async (req, res) => {
    await storage.deleteStock(Number(req.params.id));
    res.status(204).send();
  });

  /* === LISTS === */

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
          field: err.errors[0].path.join("."),
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
          field: err.errors[0].path.join("."),
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

  app.delete("/api/lists/:id/items/all", async (req, res) => {
    const listId = Number(req.params.id);
    await storage.clearListItems(listId);
    res.status(204).send();
  });

  /* === NEWS === */

  app.get("/api/news", async (_req, res) => {

    const news = [
      { id: 1, title: "Market Update: Nifty hits record high as banks rally", source: "TradeNews", time: "2h ago", url: "#" },
      { id: 2, title: "Fed meeting outcome: What traders need to know today", source: "GlobalFinance", time: "4h ago", url: "#" },
      { id: 3, title: "Top 5 stocks to watch for swing trading this week", source: "InvestInsight", time: "5h ago", url: "#" },
      { id: 4, title: "Reliance Industries reports strong quarterly earnings", source: "BusinessDaily", time: "6h ago", url: "#" },
      { id: 5, title: "FII activity surges in IT sector stocks", source: "MarketWatch", time: "8h ago", url: "#" },
    ];

    res.json(news);
  });

  /* === SCREENER FUNDAMENTALS === */

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

          const data = JSON.parse(await response.text());

          return res.json({
            success: true,
            source: "screener",
            data,
          });
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

            return res.json({
              success: true,
              source: "screener-html",
              data: parsed,
            });
          }
        }

      } catch {
        continue;
      }
    }

    return res.status(404).json({
      success: false,
      message: `Could not fetch data for ${symbol}`,
    });
  });

  /* === SEED DATA === */

  await seedDatabase();

  app.get("/api/stocks/:id/fundamentals", async (req, res) => {

    const id = Number(req.params.id);

    const fund = await storage.getFundamentals(id);

    if (!fund) return res.json(null);

    res.json(fund);
  });

  return httpServer;
}

/* DATABASE SEED */

async function seedDatabase() {

  const existingStocks = await storage.getAllStocks();

  if (existingStocks.length > 0) return;

  console.log("Seeding database...");

  const symbols = [
    "RELIANCE",
    "TCS",
    "INFY",
    "HDFCBANK",
    "ICICIBANK",
    "SBIN",
    "BHARTIARTL",
    "ITC",
    "KOTAKBANK",
    "LICI",
  ];

  await storage.bulkCreateStocks(symbols);

  console.log("Seeding completed.");
}
