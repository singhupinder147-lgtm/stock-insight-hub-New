import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type BulkAddStocksRequest } from "@shared/routes";

export function useStocks() {
  return useQuery({
    queryKey: [api.stocks.list.path],
    queryFn: async () => {
      const res = await fetch(api.stocks.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch stocks");
      return api.stocks.list.responses[200].parse(await res.json());
    },
  });
}

export function useStock(id: number) {
  return useQuery({
    queryKey: [api.stocks.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.stocks.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch stock details");
      return api.stocks.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

export function useBulkCreateStocks() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: BulkAddStocksRequest) => {
      const res = await fetch(api.stocks.bulkCreate.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 400) {
          const error = api.stocks.bulkCreate.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error("Failed to create stocks");
      }
      return api.stocks.bulkCreate.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.stocks.list.path] });
    },
  });
}

export function useDeleteStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.stocks.delete.path, { id });
      const res = await fetch(url, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete stock");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.stocks.list.path] });
    },
  });
}
