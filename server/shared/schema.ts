
import { pgTable, text, serial, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// === TABLE DEFINITIONS ===

export const stocks = pgTable("stocks", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull().unique(),
  name: text("name"), // Optional company name
  addedAt: timestamp("added_at").defaultNow(),
});

export const lists = pgTable("lists", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const listItems = pgTable("list_items", {
  id: serial("id").primaryKey(),
  listId: integer("list_id").notNull(), // Foreign key to lists
  stockId: integer("stock_id").notNull(), // Foreign key to stocks
  addedAt: timestamp("added_at").defaultNow(),
});

// Fundamentals data (stored as JSONB for flexibility as requested)
export const fundamentals = pgTable("fundamentals", {
  id: serial("id").primaryKey(),
  stockId: integer("stock_id").notNull().unique(), // Foreign key to stocks
  shareholding: jsonb("shareholding").default({}), // Promoter, FII, etc.
  quarterlyResults: jsonb("quarterly_results").default([]), // Array of objects
  profitLoss: jsonb("profit_loss").default([]), // Array of objects
  updatedAt: timestamp("updated_at").defaultNow(),
});

// === RELATIONS ===

export const stocksRelations = relations(stocks, ({ many, one }) => ({
  listItems: many(listItems),
  fundamentals: one(fundamentals, {
    fields: [stocks.id],
    references: [fundamentals.stockId],
  }),
}));

export const listsRelations = relations(lists, ({ many }) => ({
  items: many(listItems),
}));

export const listItemsRelations = relations(listItems, ({ one }) => ({
  list: one(lists, {
    fields: [listItems.listId],
    references: [lists.id],
  }),
  stock: one(stocks, {
    fields: [listItems.stockId],
    references: [stocks.id],
  }),
}));

export const fundamentalsRelations = relations(fundamentals, ({ one }) => ({
  stock: one(stocks, {
    fields: [fundamentals.stockId],
    references: [stocks.id],
  }),
}));

// === BASE SCHEMAS ===

export const insertStockSchema = createInsertSchema(stocks).omit({ id: true, addedAt: true });
export const insertListSchema = createInsertSchema(lists).omit({ id: true, createdAt: true });
export const insertListItemSchema = createInsertSchema(listItems).omit({ id: true, addedAt: true });

// === EXPLICIT API CONTRACT TYPES ===

export type Stock = typeof stocks.$inferSelect;
export type InsertStock = z.infer<typeof insertStockSchema>;

export type StockList = typeof lists.$inferSelect;
export type InsertStockList = z.infer<typeof insertListSchema>;

export type ListItem = typeof listItems.$inferSelect;
export type InsertListItem = z.infer<typeof insertListItemSchema>;

export type Fundamentals = typeof fundamentals.$inferSelect;

// Request/Response types

// For bulk adding stocks
export const bulkAddStocksSchema = z.object({
  symbols: z.array(z.string()),
});
export type BulkAddStocksRequest = z.infer<typeof bulkAddStocksSchema>;

// For adding to a list
export const addToListSchema = z.object({
  stockId: z.number(),
});
export type AddToListRequest = z.infer<typeof addToListSchema>;

export type StockResponse = Stock & {
  fundamentals?: Fundamentals | null;
};

export type ListResponse = StockList & {
  itemCount?: number;
};
