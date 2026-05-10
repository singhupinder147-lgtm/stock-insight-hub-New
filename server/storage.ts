
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
  updateStockPrice(id: number, data: Partial<Stock>): Promise<Stock>;

  // Lists
  getLists(): Promise<(StockList & { itemCount: number })[]>;
  getList(id: number): Promise<StockList | undefined>;
  createList(list: InsertStockList): Promise<StockList>;
  deleteList(id: number): Promise<void>;

  // List Items
  getListItems(listId: number): Promise<Stock[]>;
  addListItem(item: InsertListItem): Promise<ListItem>;
  removeListItem(listId: number, stockId: number): Promise<void>;

  clearAllListItems(): Promise<void>;
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
    
    // Deduplicate and prepare values
    const uniqueSymbols = [...new Set(symbols.map(s => s.trim().toUpperCase()))];
    
    let count = 0;
    // We do this in a loop or with ON CONFLICT DO NOTHING if supported, 
    // but Drizzle/PG simple insert with ignore is safer done via upsert or check
    // For simplicity, we'll try to insert one by one or filter existing.
    // Let's use ON CONFLICT DO NOTHING equivalent
    
    await db.insert(stocks)
      .values(uniqueSymbols.map(s => ({ symbol: s, name: s })))
      .onConflictDoNothing({ target: stocks.symbol });
      
    // Count how many are in the list now - easier than tracking insert count directly with onConflict
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

  async updateStockPrice(id: number, data: Partial<Stock>): Promise<Stock> {
    const [updated] = await db.update(stocks)
      .set(data)
      .where(eq(stocks.id, id))
      .returning();
    return updated;
  }

  // Lists
  async getLists(): Promise<(StockList & { itemCount: number })[]> {
    // This requires a join or subquery to count items
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
    // Join stocks and listItems
    const rows = await db.select({ stock: stocks })
      .from(listItems)
      .innerJoin(stocks, eq(listItems.stockId, stocks.id))
      .where(eq(listItems.listId, listId));
      
    return rows.map(r => r.stock);
  }

  async addListItem(item: InsertListItem): Promise<ListItem> {
    // Check if exists
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

  async clearAllListItems(): Promise<void> {
    const allLists = await db.select({ id: lists.id }).from(lists);
    for (const list of allLists) {
      await db.delete(listItems).where(eq(listItems.listId, list.id));
    }
  }

  async clearListItems(listId: number): Promise<void> {
    await db.delete(listItems).where(eq(listItems.listId, listId));
  }

  // Fundamentals
  async getFundamentals(stockId: number): Promise<Fundamentals | undefined> {
    const [fund] = await db.select().from(fundamentals).where(eq(fundamentals.stockId, stockId));
    return fund;
  }

  async createFundamentals(data: Partial<Fundamentals> & { stockId: number }): Promise<Fundamentals> {
    const [fund] = await db.insert(fundamentals)
      .values(data)
      .onConflictDoUpdate({
        target: fundamentals.stockId,
        set: { ...data, updatedAt: new Date() }
      })
      .returning();
    return fund;
  }
}

export const storage = new DatabaseStorage();
