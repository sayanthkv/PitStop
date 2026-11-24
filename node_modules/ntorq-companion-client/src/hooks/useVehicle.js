import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';

export function useVehicle() {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['primaryVehicle'],
    queryFn: async () => {
      const res = await api.get('/vehicle');
      return res.vehicle;
    },
    staleTime: 60 * 1000,
  });

  const setupMutation = useMutation({
    mutationFn: (formData) => api.post('/vehicle/setup', formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['primaryVehicle'] });
      queryClient.invalidateQueries({ queryKey: ['odometerStats'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (formData) => api.put('/vehicle', formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['primaryVehicle'] });
    },
  });

  const manualFuelMutation = useMutation({
    mutationFn: ({ litres, odometer }) => api.post('/vehicle/manual-fuel-correction', { litres, odometer }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['primaryVehicle'] });
      queryClient.invalidateQueries({ queryKey: ['fuelEstimate'] });
      queryClient.invalidateQueries({ queryKey: ['activeAlerts'] });
    },
  });

  return {
    vehicle: data,
    isLoading,
    error,
    refetch,
    setupVehicle: setupMutation.mutateAsync,
    updateVehicle: updateMutation.mutateAsync,
    correctManualFuel: manualFuelMutation.mutateAsync,
  };
}
