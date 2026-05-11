import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

import {
  api,
  buildUrl,
  type InsertStockList,
  type AddToListRequest,
} from "@shared/routes";

/**
 * 🔑 Centralized query keys (IMPORTANT FIX)
 */
const queryKeys = {
  lists: ["lists"] as const,
  listItems: (listId: number) =>
    ["list-items", listId] as const,
  stocks: ["stocks"] as const,
};

/* -----------------------------
   LISTS
------------------------------*/

export function useLists() {
  return useQuery({
    queryKey: queryKeys.lists,
    queryFn: async () => {
      const res = await fetch(api.lists.list.path, {
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to fetch lists");

      return api.lists.list.responses[200].parse(
        await res.json()
      );
    },
  });
}

export function useCreateList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: InsertStockList) => {
      const res = await fetch(api.lists.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to create list");

      return api.lists.create.responses[201].parse(
        await res.json()
      );
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.lists,
      });
    },
  });
}

export function useDeleteList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.lists.delete.path, { id });

      const res = await fetch(url, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to delete list");

      return true;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.lists,
      });
    },
  });
}

/* -----------------------------
   LIST ITEMS
------------------------------*/

export function useListItems(listId: number) {
  return useQuery({
    queryKey: queryKeys.listItems(listId),

    queryFn: async () => {
      const url = buildUrl(api.lists.getItems.path, {
        id: listId,
      });

      const res = await fetch(url, {
        credentials: "include",
      });

      if (!res.ok)
        throw new Error("Failed to fetch list items");

      return api.lists.getItems.responses[200].parse(
        await res.json()
      );
    },

    enabled: !!listId,
  });
}

export function useAddListItem(listId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: AddToListRequest) => {
      const url = buildUrl(api.lists.addItem.path, {
        id: listId,
      });

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!res.ok)
        throw new Error("Failed to add item to list");

      return api.lists.addItem.responses[201].parse(
        await res.json()
      );
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.listItems(listId),
      });

      queryClient.invalidateQueries({
        queryKey: queryKeys.lists,
      });

      queryClient.invalidateQueries({
        queryKey: queryKeys.stocks,
      });
    },
  });
}

export function useRemoveListItem(listId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (stockId: number) => {
      const url = buildUrl(api.lists.removeItem.path, {
        id: listId,
        stockId,
      });

      const res = await fetch(url, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok)
        throw new Error(
          "Failed to remove item from list"
        );

      return true;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.listItems(listId),
      });

      queryClient.invalidateQueries({
        queryKey: queryKeys.lists,
      });

      queryClient.invalidateQueries({
        queryKey: queryKeys.stocks,
      });
    },
  });
}

/* -----------------------------
   CLEAR ALL LIST ITEMS
------------------------------*/

export function useClearAllListItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch(
        api.lists.clearAllItems.path,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (!res.ok)
        throw new Error(
          "Failed to clear all list items"
        );

      return true;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.lists,
      });

      queryClient.invalidateQueries({
        queryKey: ["list-items"],
      });

      queryClient.invalidateQueries({
        queryKey: queryKeys.stocks,
      });
    },
  });
}

/* -----------------------------
   CLEAR SINGLE LIST
------------------------------*/

export function useClearListItems(listId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const url = buildUrl(
        api.lists.clearItems.path,
        { id: listId }
      );

      const res = await fetch(url, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok)
        throw new Error("Failed to clear list items");

      return true;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.listItems(listId),
      });

      queryClient.invalidateQueries({
        queryKey: queryKeys.lists,
      });
    },
  });
}
