import { db } from "./db";
import {
  stocks, lists, listItems, fundamentals,
  type Stock, type InsertStock, type StockList, type InsertStockList,
  type ListItem, type InsertListItem, type Fundamentals
} from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";

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

  // Fundamentals
  getFundamentals(stockId: number): Promise<Fundamentals | undefined>;
  createFundamentals(data: Partial<Fundamentals> & { stockId: number }): Promise<Fundamentals>;
}

export class DatabaseStorage implements IStorage {
  // Stocks
  async getAllStocks(): Promise<Stock[]> {
    return await db.select().from(stocks).orderBy(stocks.symbol);
  }

  async getStock(id: number): Promise<Stock | undefined> {
    const [stock] = await db.select().from(stocks).where(eq(stocks.id, id));
    return stock;
  }

  async getStockBySymbol(symbol: string): Promise<Stock | undefined> {
    const [stock] = await db.select().from(stocks).where(eq(stocks.symbol, symbol));
    return stock;
  }

  async createStock(insertStock: InsertStock): Promise<Stock> {
    const [stock] = await db.insert(stocks).values(insertStock).returning();
    return stock;
  }

  async bulkCreateStocks(symbols: string[]): Promise<number> {
    if (symbols.length === 0) return 0;
    const uniqueSymbols = [...new Set(symbols.map(s => s.trim().toUpperCase()))];
    await db.insert(stocks)
      .values(uniqueSymbols.map(s => ({ symbol: s, name: s })))
      .onConflictDoNothing({ target: stocks.symbol });
    return uniqueSymbols.length;
  }

  async deleteStock(id: number): Promise<void> {
    await db.delete(listItems).where(eq(listItems.stockId, id));
    await db.delete(fundamentals).where(eq(fundamentals.stockId, id));
    await db.delete(stocks).where(eq(stocks.id, id));
  }

  async searchStocks(query: string): Promise<Stock[]> {
    return await db.select().from(stocks)
      .where(sql`${stocks.symbol} ILIKE ${`%${query}%`}`)
      .limit(10);
  }

  // Lists
  async getLists(): Promise<(StockList & { itemCount: number })[]> {
    const allLists = await db.select().from(lists);
    const result = [];
    for (const list of allLists) {
      const [count] = await db.select({ count: sql<number>`count(*)` })
        .from(listItems)
        .where(eq(listItems.listId, list.id));
      result.push({ ...list, itemCount: Number(count.count) });
    }
    return result;
  }

  async getList(id: number): Promise<StockList | undefined> {
    const [list] = await db.select().from(lists).where(eq(lists.id, id));
    return list;
  }

  async createList(list: InsertStockList): Promise<StockList> {
    const [newList] = await db.insert(lists).values(list).returning();
    return newList;
  }

  async deleteList(id: number): Promise<void> {
    await db.delete(listItems).where(eq(listItems.listId, id));
    await db.delete(lists).where(eq(lists.id, id));
  }

  // List Items
  async getListItems(listId: number): Promise<Stock[]> {
    const rows = await db.select({ stock: stocks })
      .from(listItems)
      .innerJoin(stocks, eq(listItems.stockId, stocks.id))
      .where(eq(listItems.listId, listId));
    return rows.map(r => r.stock);
  }

  async addListItem(item: InsertListItem): Promise<ListItem> {
    const [existing] = await db.select()
      .from(listItems)
      .where(and(
        eq(listItems.listId, item.listId),
        eq(listItems.stockId, item.stockId)
      ));
    if (existing) return existing;
    const [newItem] = await db.insert(listItems).values(item).returning();
    return newItem;
  }

  async removeListItem(listId: number, stockId: number): Promise<void> {
    await db.delete(listItems)
      .where(and(
        eq(listItems.listId, listId),
        eq(listItems.stockId, stockId)
      ));
  }

  // ✅ NEW - Clear all stocks from a list
  async clearListItems(listId: number): Promise<void> {
    await db.delete(listItems)
      .where(eq(listItems.listId, listId));
  }

  // Fundamentals
  async getFundamentals(stockId: number): Promise<Fundamentals | undefined> {
    const [fund] = await db.select().from(fundamentals).where(eq(fundamentals.stockId, stockId));
    if (fund) return fund;

    const [stock] = await db.select().from(stocks).where(eq(stocks.id, stockId));
    if (!stock) return undefined;

    const mockFund: Partial<Fundamentals> & { stockId: number } = {
      stockId,
      shareholding: {
        promoter: 40 + (stockId % 20) + Math.random() * 5,
        fii: 10 + (stockId % 15) + Math.random() * 5,
        dii: 10 + (stockId % 10) + Math.random() * 5,
        public: 5 + (stockId % 5) + Math.random() * 5
      },
      quarterlyResults: [
        { quarter: "Dec 2023", sales: 1000 + (stockId * 10), profit: 100 + stockId, opm: 10 + (stockId % 5), eps: 1.2 + (stockId / 100) },
        { quarter: "Mar 2024", sales: 1100 + (stockId * 10), profit: 110 + stockId, opm: 10 + (stockId % 5), eps: 1.3 + (stockId / 100) },
        { quarter: "Jun 2024", sales: 1050 + (stockId * 10), profit: 95 + stockId, opm: 9 + (stockId % 5), eps: 1.1 + (stockId / 100) },
        { quarter: "Sep 2024", sales: 1200 + (stockId * 10), profit: 130 + stockId, opm: 11 + (stockId % 5), eps: 1.5 + (stockId / 100) },
        { quarter: "Dec 2024", sales: 1300 + (stockId * 10), profit: 150 + stockId, opm: 12 + (stockId % 5), eps: 1.8 + (stockId / 100) },
        { quarter: "Mar 2025", sales: 1400 + (stockId * 10), profit: 170 + stockId, opm: 12 + (stockId % 5), eps: 2.0 + (stockId / 100) },
      ],
      profitLoss: [
        { year: "2021", sales: 4000 + (stockId * 40), netProfit: 400 + (stockId * 4) },
        { year: "2022", sales: 4500 + (stockId * 45), netProfit: 450 + (stockId * 4) },
        { year: "2023", sales: 5000 + (stockId * 50), netProfit: 550 + (stockId * 5) },
        { year: "2024", sales: 6000 + (stockId * 60), netProfit: 700 + (stockId * 6) },
        { year: "2025 (Est)", sales: 7000 + (stockId * 70), netProfit: 850 + (stockId * 7) },
        { year: "2026 (Proj)", sales: 8500 + (stockId * 85), netProfit: 1000 + (stockId * 8) },
      ]
    };

    return await this.createFundamentals(mockFund);
  }

  async createFundamentals(data: Partial<Fundamentals> & { stockId: number }): Promise<Fundamentals> {
    const [fund] = await db.insert(fundamentals).values(data).returning();
    return fund;
  }
}

export const storage = new DatabaseStorage();
