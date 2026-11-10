import { useQuery } from '@tanstack/react-query';
import { api } from './api';

export interface CoverageArea { id: number; name: string; serviceEnabled: boolean; deliveryEnabled: boolean; deliveryFee: number; deliveryDays: number | null }
export interface CoverageGovernorate {
  id: number; name: string; serviceEnabled: boolean; deliveryEnabled: boolean; deliveryFee: number;
  freeDeliveryOver: number | null; deliveryDays: number | null; areas: CoverageArea[];
}
export interface Coverage {
  governorates: CoverageGovernorate[];
  freeDeliveryOver: number | null;
  serviceFees: Record<string, number>;
}

/** Active governorates with their areas, managed from "مناطق الخدمة والتسعير". */
export function useCoverage() {
  return useQuery({
    queryKey: ['coverage'],
    queryFn: async () => (await api.get<Coverage>('/coverage')).data,
    staleTime: 60_000,
  });
}
