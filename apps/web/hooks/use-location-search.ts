import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/use-debounce";

export function useLocationSearch(query: string) {
  const debounced = useDebounce(query, 250);

  return useQuery({
    queryKey: ["location-search", debounced],
    queryFn: async () => {
      if (!debounced.trim()) return { items: [] };
      const response = await fetch(
        `/api/locations/search?q=${encodeURIComponent(debounced)}&limit=10`,
      );
      if (!response.ok) throw new Error("Failed to search locations");
      return response.json();
    },
    enabled: debounced.trim().length > 1,
    staleTime: 1000 * 15,
  });
}
