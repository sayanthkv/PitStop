import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { BottomSheet } from '../../components/common/BottomSheet.jsx';
import { AlertTriangle, Clock, X, Bell } from 'lucide-react';

export function AlertsDrawer({ isOpen, onClose, onNavigate }) {
  const queryClient = useQueryClient();

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['activeAlerts'],
    queryFn: async () => (await api.get('/alerts')).alerts,
  });

  const dismissMutation = useMutation({
    mutationFn: (key) => api.post(`/alerts/${key}/dismiss`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['activeAlerts'] }),
  });

  const snoozeMutation = useMutation({
    mutationFn: ({ key, days }) => api.post(`/alerts/${key}/snooze`, { days }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['activeAlerts'] }),
  });

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Active Alerts & Reminders">
      <div className="space-y-3">
        {isLoading && <p className="text-xs text-zinc-400">Loading alerts...</p>}

        {!isLoading && alerts.length === 0 && (
          <div className="text-center py-8">
            <Bell className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
            <p className="text-sm font-display font-semibold text-zinc-300">All Systems Clear</p>
            <p className="text-xs text-zinc-400 mt-1">No active alerts, service warnings, or expiring documents.</p>
          </div>
        )}

        {alerts.map((alert) => (
          <div
            key={alert.alertKey}
            className={`p-3.5 rounded-xl border flex flex-col gap-2 ${
              alert.severity === 'critical'
                ? 'bg-rose-950/20 border-rose-500/40'
                : 'bg-carbon-800/80 border-carbon-700'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2.5">
                <AlertTriangle
                  className={`w-4 h-4 shrink-0 mt-0.5 ${
                    alert.severity === 'critical' ? 'text-rose-400' : 'text-amber-400'
                  }`}
                />
                <div>
                  <h4 className="font-display font-bold text-xs text-zinc-100">{alert.title}</h4>
                  <p className="text-[11px] text-zinc-400 font-sans mt-0.5 leading-relaxed">
                    {alert.message}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-carbon-700/60 mt-1">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => snoozeMutation.mutate({ key: alert.alertKey, days: 3 })}
                  className="text-[10px] font-mono text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
                >
                  <Clock className="w-3 h-3" /> Snooze 3d
                </button>
                <button
                  onClick={() => dismissMutation.mutate(alert.alertKey)}
                  className="text-[10px] font-mono text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> Dismiss
                </button>
              </div>

              {alert.link && (
                <button
                  onClick={() => {
                    onClose();
                    onNavigate(alert.link.replace('/', ''));
                  }}
                  className="text-[11px] font-mono text-amber-400 font-bold"
                >
                  Resolve &rarr;
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </BottomSheet>
  );
}
