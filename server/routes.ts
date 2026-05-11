import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { db } from "./db";
import { lists } from "@shared/schema";
import { eq } from "drizzle-orm";

/* -------------------------
   SAFE HELPERS
--------------------------*/

const toNumber = (val: any) => {
  const n = Number(val);
  if (isNaN(n)) throw new Error("Invalid ID");
  return n;
};

/* -------------------------
   ROUTES
--------------------------*/

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  /* =========================
      STOCKS
  ==========================*/

  app.get(api.stocks.list.path, async (req, res) => {
    try {
      const stocks = await storage.getAllStocks();
      res.json(stocks);
    } catch {
      res.status(500).json({ message: "Failed to fetch stocks" });
    }
  });

  app.get(api.stocks.search.path, async (req, res) => {
    try {
      const query = req.query.query as string;
      if (!query) return res.json([]);

      const stocks = await storage.searchStocks(query);
      res.json(stocks);
    } catch {
      res.status(500).json({ message: "Search failed" });
    }
  });

  app.get(api.stocks.get.path, async (req, res) => {
    try {
      const id = toNumber(req.params.id);

      const stock = await storage.getStock(id);
      if (!stock) {
        return res.status(404).json({ message: "Stock not found" });
      }

      const fund = await storage.getFundamentals(id);
      res.json({ ...stock, fundamentals: fund || null });
    } catch {
      res.status(400).json({ message: "Invalid stock id" });
    }
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
      res.status(500).json({ message: "Bulk create failed" });
    }
  });

  app.delete(api.stocks.delete.path, async (req, res) => {
    try {
      const id = toNumber(req.params.id);
      await storage.deleteStock(id);
      res.status(204).send();
    } catch {
      res.status(400).json({ message: "Invalid stock id" });
    }
  });

  /* =========================
      LISTS
  ==========================*/

  app.get(api.lists.list.path, async (req, res) => {
    try {
      const data = await storage.getLists();
      res.json(data);
    } catch {
      res.status(500).json({ message: "Failed to fetch lists" });
    }
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
      res.status(500).json({ message: "Create list failed" });
    }
  });

  app.delete(api.lists.delete.path, async (req, res) => {
    try {
      const id = toNumber(req.params.id);
      await storage.deleteList(id);
      res.status(204).send();
    } catch {
      res.status(400).json({ message: "Invalid list id" });
    }
  });

  app.patch("/api/lists/:id", async (req, res) => {
    try {
      const id = toNumber(req.params.id);
      const { name } = req.body;

      if (!name?.trim()) {
        return res.status(400).json({ message: "Name is required" });
      }

      const [updated] = await db
        .update(lists)
        .set({ name: name.trim() })
        .where(eq(lists.id, id))
        .returning();

      if (!updated) {
        return res.status(404).json({ message: "List not found" });
      }

      res.json(updated);
    } catch {
      res.status(500).json({ message: "Rename failed" });
    }
  });

  /* =========================
      LIST ITEMS
  ==========================*/

  app.get(api.lists.getItems.path, async (req, res) => {
    try {
      const id = toNumber(req.params.id);
      const items = await storage.getListItems(id);
      res.json(items);
    } catch {
      res.status(400).json({ message: "Invalid list id" });
    }
  });

  app.post(api.lists.addItem.path, async (req, res) => {
    try {
      const listId = toNumber(req.params.id);
      const { stockId } = api.lists.addItem.input.parse(req.body);

      const item = await storage.addListItem({
        listId,
        stockId,
      });

      res.status(201).json(item);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      res.status(500).json({ message: "Add item failed" });
    }
  });

  app.delete(api.lists.removeItem.path, async (req, res) => {
    try {
      const listId = toNumber(req.params.id);
      const stockId = toNumber(req.params.stockId);

      await storage.removeListItem(listId, stockId);
      res.status(204).send();
    } catch {
      res.status(400).json({ message: "Invalid parameters" });
    }
  });

  app.delete(api.lists.clearItems.path, async (req, res) => {
    try {
      const listId = toNumber(req.params.id);

      await storage.clearListItems(listId);
      res.status(204).send();
    } catch {
      res.status(400).json({ message: "Invalid list id" });
    }
  });

  app.delete(api.lists.clearAllItems.path, async (req, res) => {
    try {
      await storage.clearAllListItems();
      res.status(204).send();
    } catch {
      res.status(500).json({ message: "Clear all failed" });
    }
  });

  /* =========================
      NEWS
  ==========================*/

  app.get("/api/news", async (req, res) => {
    try {
      res.json([
        {
          id: 1,
          title: "Market Update: Nifty hits record high",
          source: "TradeNews",
          time: "2h ago",
          url: "#",
        },
        {
          id: 2,
          title: "Fed meeting outcome insights",
          source: "GlobalFinance",
          time: "4h ago",
          url: "#",
        },
      ]);
    } catch {
      res.status(500).json({ message: "Failed to fetch news" });
    }
  });

  /* =========================
      SEED (FIXED - NO DUPLICATES)
  ==========================*/

  await seedDatabase();

  return httpServer;
}

/* =========================
   SEED FUNCTION (CLEANED)
==========================*/

async function seedDatabase() {
  const existingStocks = await storage.getAllStocks();

  if (existingStocks.length > 0) {
    return; // prevent duplicate seeding (IMPORTANT FIX)
  }

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

  const favorites = await storage.createList({
    name: "Favorites",
    description: "My top picks",
  });

  const swing = await storage.createList({
    name: "Swing Trading",
    description: "Short term opportunities",
  });

  const stocks = await storage.getAllStocks();

  const reliance = stocks.find((s) => s.symbol === "RELIANCE");
  const tcs = stocks.find((s) => s.symbol === "TCS");

  if (reliance && tcs) {
    await storage.addListItem({
      listId: favorites.id,
      stockId: reliance.id,
    });

    await storage.addListItem({
      listId: favorites.id,
      stockId: tcs.id,
    });

    await storage.addListItem({
      listId: swing.id,
      stockId: reliance.id,
    });
  }

  console.log("Seeding completed.");
}
