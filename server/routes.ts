import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { db } from "./db";
import { lists } from "@shared/schema";
import { eq } from "drizzle-orm";

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

    res.json({
      ...stock,
      fundamentals: fund || null
    });
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

  // ✅ Rename list
  app.patch("/api/lists/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { name } = req.body;

      if (!name || name.trim().length === 0) {
        return res.status(400).json({
          message: "Name is required"
        });
      }

      const [updated] = await db
        .update(lists)
        .set({ name: name.trim() })
        .where(eq(lists.id, id))
        .returning();

      if (!updated) {
        return res.status(404).json({
          message: "List not found"
        });
      }

      res.json(updated);
    } catch (err) {
      res.status(500).json({
        message: "Failed to rename list"
      });
    }
  });

  app.get(api.lists.getItems.path, async (req, res) => {
    const items = await storage.getListItems(Number(req.params.id));
    res.json(items);
  });

  app.post(api.lists.addItem.path, async (req, res) => {
    try {
      const listId = Number(req.params.id);

      const { stockId } = api.lists.addItem.input.parse(req.body);

      const item = await storage.addListItem({
        listId,
        stockId
      });

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

  // ✅ Delete all stocks from current list
  app.delete("/api/lists/:id/items/all", async (req, res) => {
    try {
      const listId = Number(req.params.id);

      await storage.clearListItems(listId);

      res.status(204).send();
    } catch (err) {
      res.status(500).json({
        message: "Failed to clear list items",
      });
    }
  });

  app.get("/api/news", async (req, res) => {
    try {
      const news = [
        {
          id: 1,
          title: "Market Update: Nifty hits record high as banks rally",
          source: "TradeNews",
          time: "2h ago",
          url: "#"
        },
        {
          id: 2,
          title: "Fed meeting outcome: What traders need to know today",
          source: "GlobalFinance",
          time: "4h ago",
          url: "#"
        },
        {
          id: 3,
          title: "Top 5 stocks to watch for swing trading this week",
          source: "InvestInsight",
          time: "5h ago",
          url: "#"
        },
        {
          id: 4,
          title: "Reliance Industries reports strong quarterly earnings",
          source: "BusinessDaily",
          time: "6h ago",
          url: "#"
        },
        {
          id: 5,
          title: "FII activity surges in IT sector stocks",
          source: "MarketWatch",
          time: "8h ago",
          url: "#"
        }
      ];

      res.json(news);
    } catch (err) {
      res.status(500).json({
        message: "Failed to fetch news"
      });
    }
  });

  // === SEED DATA ===
  

  app.get("/api/stocks/:id/fundamentals", async (req, res) => {
    const id = Number(req.params.id);

    const fund = await storage.getFundamentals(id);

    if (!fund) return res.json(null);

    res.json(fund);
  });

  return httpServer;
}

