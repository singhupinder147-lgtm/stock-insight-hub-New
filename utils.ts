import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type InsertStockList, type AddToListRequest } from "@shared/routes";

export function useLists() {
  return useQuery({
    queryKey: [api.lists.list.path],
    queryFn: async () => {
      const res = await fetch(api.lists.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch lists");
      return api.lists.list.responses[200].parse(await res.json());
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
      return api.lists.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.lists.list.path] });
    },
  });
}

export function useDeleteList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.lists.delete.path, { id });
      const res = await fetch(url, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete list");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.lists.list.path] });
    },
  });
}

export function useListItems(listId: number) {
  return useQuery({
    queryKey: [api.lists.getItems.path, listId],
    queryFn: async () => {
      const url = buildUrl(api.lists.getItems.path, { id: listId });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch list items");
      return api.lists.getItems.responses[200].parse(await res.json());
    },
    enabled: !!listId,
  });
}

export function useAddListItem(listId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: AddToListRequest) => {
      const url = buildUrl(api.lists.addItem.path, { id: listId });
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to add item to list");
      return api.lists.addItem.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.lists.getItems.path, listId] });
      queryClient.invalidateQueries({ queryKey: [api.lists.list.path] });
      queryClient.invalidateQueries({ queryKey: ["/api/stocks"] });
    },
  });
}

export function useRemoveListItem(listId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (stockId: number) => {
      const url = buildUrl(api.lists.removeItem.path, { id: listId, stockId });
      const res = await fetch(url, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to remove item from list");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.lists.getItems.path, listId] });
      queryClient.invalidateQueries({ queryKey: [api.lists.list.path] });
      queryClient.invalidateQueries({ queryKey: ["/api/stocks"] });
    },
  });
}
