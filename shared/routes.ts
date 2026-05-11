import { z } from "zod";
import {
  insertStockSchema,
  insertListSchema,
  bulkAddStocksSchema,
  addToListSchema,
  stocks,
  lists,
  listItems,
  fundamentals,
} from "./schema";

/* -------------------------
   ERROR SCHEMAS
--------------------------*/

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),

  notFound: z.object({
    message: z.string(),
  }),

  internal: z.object({
    message: z.string(),
  }),
};

/* -------------------------
   API DEFINITIONS
--------------------------*/

export const api = {
  stocks: {
    list: {
      method: "GET" as const,
      path: "/api/stocks" as const,
      responses: {
        200: z.array(z.any()), // safer fallback
      },
    },

    get: {
      method: "GET" as const,
      path: "/api/stocks/:id" as const,
      responses: {
        200: z.object({
          id: z.number(),
          symbol: z.string(),
          name: z.string().nullable(),
          fundamentals: z.any().nullable(),
        }),
        404: errorSchemas.notFound,
      },
    },

    bulkCreate: {
      method: "POST" as const,
      path: "/api/stocks/bulk" as const,
      input: bulkAddStocksSchema,
      responses: {
        201: z.object({ count: z.number() }),
        400: errorSchemas.validation,
      },
    },

    delete: {
      method: "DELETE" as const,
      path: "/api/stocks/:id" as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },

    search: {
      method: "GET" as const,
      path: "/api/stocks/search" as const,
      input: z.object({
        query: z.string(),
      }),
      responses: {
        200: z.array(z.any()),
      },
    },
  },

  lists: {
    list: {
      method: "GET" as const,
      path: "/api/lists" as const,
      responses: {
        200: z.array(
          z.object({
            id: z.number(),
            name: z.string(),
            description: z.string().nullable(),
            itemCount: z.number(),
          })
        ),
      },
    },

    create: {
      method: "POST" as const,
      path: "/api/lists" as const,
      input: insertListSchema,
      responses: {
        201: z.any(),
        400: errorSchemas.validation,
      },
    },

    delete: {
      method: "DELETE" as const,
      path: "/api/lists/:id" as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },

    getItems: {
      method: "GET" as const,
      path: "/api/lists/:id/items" as const,
      responses: {
        200: z.array(z.any()),
        404: errorSchemas.notFound,
      },
    },

    addItem: {
      method: "POST" as const,
      path: "/api/lists/:id/items" as const,
      input: addToListSchema,
      responses: {
        201: z.any(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },

    removeItem: {
      method: "DELETE" as const,
      path: "/api/lists/:id/items/:stockId" as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },

    clearAllItems: {
      method: "DELETE" as const,
      path: "/api/lists/clear-all" as const,
      responses: {
        204: z.void(),
      },
    },

    clearItems: {
      method: "DELETE" as const,
      path: "/api/lists/:id/clear" as const,
      responses: {
        204: z.void(),
      },
    },
  },
};

/* -------------------------
   URL BUILDER
--------------------------*/

export function buildUrl(
  path: string,
  params?: Record<string, string | number>
): string {
  let url = path;

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url = url.replace(`:${key}`, String(value));
    });
  }

  return url;
}
