import { db } from "./db";
import {
  stocks,
  lists,
  listItems,
  fundamentals,
  type Stock,
  type InsertStock,
  type StockList,
  type InsertStockList,
  type ListItem,
  type InsertListItem,
  type Fundamentals,
} from "@shared/schema";

import { eq, and, sql } from "drizzle-orm";

/* -------------------------
   STORAGE INTERFACE
--------------------------*/

export interface IStorage {
  // Stocks
  getAllStocks(): Promise<Stock[]>;
  getStock(id: number): Promise<Stock | undefined>;
  getStockBySymbol(symbol: string): Promise<Stock | undefined>;
  createStock(stock: InsertStock): Promise<Stock>;
  bulkCreateStocks(symbols: string[]): Promise<number>;
  deleteStock(id: number): Promise<void>;
  searchStocks(query: string): Promise<Stock[]>;

  // Lists
  getLists(): Promise<(StockList & { itemCount: number })[]>;
  getList(id: number): Promise<StockList | undefined>;
  createList(list: InsertStockList): Promise<StockList>;
  deleteList(id: number): Promise<void>;

  // List Items
  getListItems(listId: number): Promise<Stock[]>;
  addListItem(item: InsertListItem): Promise<ListItem>;
  removeListItem(listId: number, stockId: number): Promise<void>;
  clearListItems(listId: number): Promise<void>;
  clearAllListItems(): Promise<void>;

  // Fundamentals
  getFundamentals(stockId: number): Promise<Fundamentals | undefined>;
  createFundamentals(
    data: Partial<Fundamentals> & { stockId: number }
  ): Promise<Fundamentals>;
}

/* -------------------------
   DATABASE IMPLEMENTATION
--------------------------*/

export class DatabaseStorage implements IStorage {
  /* =========================
      STOCKS
  ==========================*/

  async getAllStocks(): Promise<Stock[]> {
    return await db.select().from(stocks).orderBy(stocks.symbol);
  }

  async getStock(id: number): Promise<Stock | undefined> {
    const [stock] = await db
      .select()
      .from(stocks)
      .where(eq(stocks.id, id));
    return stock;
  }

  async getStockBySymbol(symbol: string): Promise<Stock | undefined> {
    const [stock] = await db
      .select()
      .from(stocks)
      .where(eq(stocks.symbol, symbol));
    return stock;
  }

  async createStock(insertStock: InsertStock): Promise<Stock> {
    const [stock] = await db
      .insert(stocks)
      .values(insertStock)
      .returning();
    return stock;
  }

  async bulkCreateStocks(symbols: string[]): Promise<number> {
    if (!symbols.length) return 0;

    const unique = [...new Set(symbols.map((s) => s.trim().toUpperCase()))];

    await db
      .insert(stocks)
      .values(unique.map((s) => ({ symbol: s, name: s })))
      .onConflictDoNothing({ target: stocks.symbol });

    return unique.length;
  }

  async deleteStock(id: number): Promise<void> {
    await db.delete(listItems).where(eq(listItems.stockId, id));
    await db.delete(fundamentals).where(eq(fundamentals.stockId, id));
    await db.delete(stocks).where(eq(stocks.id, id));
  }

  async searchStocks(query: string): Promise<Stock[]> {
    return await db
      .select()
      .from(stocks)
      .where(sql`${stocks.symbol} ILIKE ${`%${query}%`}`)
      .limit(10);
  }

  /* =========================
      LISTS
  ==========================*/

  async getLists(): Promise<(StockList & { itemCount: number })[]> {
    const all = await db.select().from(lists);

    const result = [];

    for (const list of all) {
      const [count] = await db
        .select({ count: sql<number>`count(*)` })
        .from(listItems)
        .where(eq(listItems.listId, list.id));

      result.push({
        ...list,
        itemCount: Number(count.count),
      });
    }

    return result;
  }

  async getList(id: number): Promise<StockList | undefined> {
    const [list] = await db
      .select()
      .from(lists)
      .where(eq(lists.id, id));
    return list;
  }

  async createList(list: InsertStockList): Promise<StockList> {
    const [newList] = await db
      .insert(lists)
      .values(list)
      .returning();
    return newList;
  }

  async deleteList(id: number): Promise<void> {
    await db.delete(listItems).where(eq(listItems.listId, id));
    await db.delete(lists).where(eq(lists.id, id));
  }

  /* =========================
      LIST ITEMS
  ==========================*/

  async getListItems(listId: number): Promise<Stock[]> {
    const rows = await db
      .select({ stock: stocks })
      .from(listItems)
      .innerJoin(stocks, eq(listItems.stockId, stocks.id))
      .where(eq(listItems.listId, listId));

    return rows.map((r) => r.stock);
  }

  async addListItem(item: InsertListItem): Promise<ListItem> {
    const [existing] = await db
      .select()
      .from(listItems)
      .where(
        and(
          eq(listItems.listId, item.listId),
          eq(listItems.stockId, item.stockId)
        )
      );

    if (existing) return existing;

    const [newItem] = await db
      .insert(listItems)
      .values(item)
      .returning();

    return newItem;
  }

  async removeListItem(
    listId: number,
    stockId: number
  ): Promise<void> {
    await db
      .delete(listItems)
      .where(
        and(
          eq(listItems.listId, listId),
          eq(listItems.stockId, stockId)
        )
      );
  }

  /* =========================
      FIXED: CLEAR OPERATIONS
  ==========================*/

  async clearAllListItems(): Promise<void> {
    // FIX: single query instead of loop (performance fix)
    await db.delete(listItems);
  }

  async clearListItems(listId: number): Promise<void> {
    await db
      .delete(listItems)
      .where(eq(listItems.listId, listId));
  }

  /* =========================
      FUNDAMENTALS
  ==========================*/

  async getFundamentals(
    stockId: number
  ): Promise<Fundamentals | undefined> {
    const [fund] = await db
      .select()
      .from(fundamentals)
      .where(eq(fundamentals.stockId, stockId));

    if (fund) return fund;

    const [stock] = await db
      .select()
      .from(stocks)
      .where(eq(stocks.id, stockId));

    if (!stock) return undefined;

    const mockFund: Partial<Fundamentals> & {
      stockId: number;
    } = {
      stockId,
      shareholding: {
        promoter: 40 + (stockId % 20),
        fii: 10 + (stockId % 15),
        dii: 10 + (stockId % 10),
        public: 10,
      },
      quarterlyResults: [],
      profitLoss: [],
    };

    return await this.createFundamentals(mockFund);
  }

  async createFundamentals(
    data: Partial<Fundamentals> & { stockId: number }
  ): Promise<Fundamentals> {
    const [fund] = await db
      .insert(fundamentals)
      .values(data)
      .returning();

    return fund;
  }
}

/* -------------------------
   EXPORT SINGLETON
--------------------------*/

export const storage = new DatabaseStorage();
