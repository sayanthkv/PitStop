import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { BottomSheet } from '../../components/common/BottomSheet.jsx';
import { formatDate } from '../../lib/formatters.js';
import { DOCUMENT_TYPES } from '../../lib/constants.js';
import {
  FileText,
  Plus,
  AlertTriangle,
  CheckCircle,
  Clock,
  RotateCcw,
  ShieldAlert,
} from 'lucide-react';

export function DocumentsPage() {
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isRenewOpen, setIsRenewOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);

  // New Document Form
  const [docForm, setDocForm] = useState({
    type: 'insurance',
    title: 'Comprehensive Insurance',
    provider: '',
    policyNumber: '',
    startDate: '',
    expiryDate: '',
    premium: '',
    notes: '',
  });

  // Renew Form
  const [renewForm, setRenewForm] = useState({
    newExpiryDate: '',
    premium: '',
    notes: '',
  });

  // Query documents (server returns them pre-sorted by urgency)
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: async () => (await api.get('/documents')).documents,
  });

  // Mutations
  const addDocMutation = useMutation({
    mutationFn: (data) => api.post('/documents', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['activeAlerts'] });
      setIsAddOpen(false);
      setDocForm({
        type: 'insurance',
        title: '',
        provider: '',
        policyNumber: '',
        startDate: '',
        expiryDate: '',
        premium: '',
        notes: '',
      });
    },
  });

  const renewDocMutation = useMutation({
    mutationFn: ({ id, data }) => api.post(`/documents/${id}/renew`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['activeAlerts'] });
      setIsRenewOpen(false);
      setSelectedDoc(null);
    },
  });

  const handleTypeSelect = (typeVal) => {
    const matched = DOCUMENT_TYPES.find((d) => d.value === typeVal);
    setDocForm((prev) => ({
      ...prev,
      type: typeVal,
      title: matched ? matched.label : prev.title,
    }));
  };

  const getStatusBadge = (status, daysRemaining) => {
    switch (status) {
      case 'expired':
        return (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30 flex items-center gap-1">
            <ShieldAlert className="w-3 h-3" /> Expired ({Math.abs(daysRemaining)}d ago)
          </span>
        );
      case 'expiring_very_soon':
        return (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20 flex items-center gap-1 animate-pulse">
            <AlertTriangle className="w-3 h-3 text-rose-400" /> Expires in {daysRemaining}d
          </span>
        );
      case 'expiring_soon':
        return (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-400" /> Expires in {daysRemaining}d
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" /> Valid ({daysRemaining}d left)
          </span>
        );
    }
  };

  return (
    <div className="space-y-4 pb-24 pt-2 px-4 max-w-md mx-auto">
      {/* Header card with Action */}
      <div className="bg-carbon-900 border border-carbon-800 rounded-2xl p-5 shadow-xl flex items-center justify-between">
        <div>
          <h3 className="font-display font-bold text-base text-zinc-100 uppercase tracking-wide flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-500" /> Vehicle Documents
          </h3>
          <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
            Insurance, PUC, Registration, License expiry tracking
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="p-2.5 rounded-xl bg-amber-500 text-carbon-950 font-bold hover:bg-amber-400 active:scale-95 transition"
          aria-label="Add Document"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
        </button>
      </div>

      {documents.length === 0 && !isLoading && (
        <div className="bg-carbon-900 border border-carbon-800 rounded-2xl p-8 text-center">
          <FileText className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
          <p className="font-display font-bold text-sm text-zinc-300">No Documents Added</p>
          <p className="text-xs text-zinc-400 mt-1 mb-4">
            Add your Insurance and PUC to receive automated renewal countdown alerts.
          </p>
          <button
            onClick={() => setIsAddOpen(true)}
            className="px-4 py-2 rounded-xl bg-amber-500 text-carbon-950 font-bold text-xs"
          >
            Add First Document
          </button>
        </div>
      )}

      {/* Sorted Document Cards */}
      <div className="space-y-2.5">
        {documents.map((doc) => (
          <div
            key={doc._id}
            className={`bg-carbon-900 border rounded-2xl p-4 shadow-md transition ${
              doc.expiryStatus === 'expired'
                ? 'border-rose-500/50 bg-rose-950/10'
                : doc.expiryStatus === 'expiring_very_soon'
                ? 'border-rose-500/30'
                : doc.expiryStatus === 'expiring_soon'
                ? 'border-amber-500/30'
                : 'border-carbon-800'
            }`}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <h4 className="font-display font-bold text-sm text-zinc-100">{doc.title}</h4>
                <div className="text-[11px] text-zinc-400 font-sans flex items-center gap-1.5 mt-0.5">
                  {doc.provider && <span>{doc.provider}</span>}
                  {doc.policyNumber && <span>· #{doc.policyNumber}</span>}
                </div>
              </div>

              {getStatusBadge(doc.expiryStatus, doc.daysRemaining)}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-carbon-800/80 text-xs font-mono">
              <span className="text-zinc-400">
                Expires: <strong className="text-zinc-200">{formatDate(doc.expiryDate)}</strong>
              </span>

              <button
                onClick={() => {
                  setSelectedDoc(doc);
                  setRenewForm({
                    newExpiryDate: '',
                    premium: doc.premium ? String(doc.premium) : '',
                    notes: '',
                  });
                  setIsRenewOpen(true);
                }}
                className="text-[11px] font-mono text-amber-400 hover:text-amber-300 px-2 py-0.5 rounded bg-carbon-800 border border-carbon-700/60 flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" /> Mark Renewed
              </button>
            </div>

            {/* Renewal history pills if any */}
            {doc.renewalHistory && doc.renewalHistory.length > 0 && (
              <div className="mt-2 text-[10px] text-zinc-400 font-mono">
                Renewed {doc.renewalHistory.length} time(s). Previous: {formatDate(doc.renewalHistory[doc.renewalHistory.length - 1].previousExpiryDate)}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add Document Modal */}
      <BottomSheet isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Add Vehicle Document">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addDocMutation.mutate({
              ...docForm,
              premium: docForm.premium ? Number(docForm.premium) : null,
              startDate: docForm.startDate || null,
            });
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">
              Document Category
            </label>
            <select
              value={docForm.type}
              onChange={(e) => handleTypeSelect(e.target.value)}
              className="w-full bg-carbon-950 border border-carbon-700 rounded-xl px-3 py-2.5 text-sm text-zinc-100 font-sans"
            >
              {DOCUMENT_TYPES.map((dt) => (
                <option key={dt.value} value={dt.value}>{dt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">
              Document Title *
            </label>
            <input
              type="text"
              required
              value={docForm.title}
              onChange={(e) => setDocForm({ ...docForm, title: e.target.value })}
              className="w-full bg-carbon-950 border border-carbon-700 rounded-xl px-3 py-2 text-sm text-zinc-100 font-sans"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">
                Provider / Authority
              </label>
              <input
                type="text"
                value={docForm.provider}
                onChange={(e) => setDocForm({ ...docForm, provider: e.target.value })}
                placeholder="e.g. Acko, RTO KA"
                className="w-full bg-carbon-950 border border-carbon-700 rounded-xl px-3 py-2 text-sm text-zinc-100 font-sans"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">
                Policy / Certificate #
              </label>
              <input
                type="text"
                value={docForm.policyNumber}
                onChange={(e) => setDocForm({ ...docForm, policyNumber: e.target.value })}
                placeholder="KA01-2023-..."
                className="w-full bg-carbon-950 border border-carbon-700 rounded-xl px-3 py-2 text-sm text-zinc-100 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">
                Start Date (Optional)
              </label>
              <input
                type="date"
                value={docForm.startDate}
                onChange={(e) => setDocForm({ ...docForm, startDate: e.target.value })}
                className="w-full bg-carbon-950 border border-carbon-700 rounded-xl px-3 py-2 text-sm text-zinc-100 font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">
                Expiry Date *
              </label>
              <input
                type="date"
                required
                value={docForm.expiryDate}
                onChange={(e) => setDocForm({ ...docForm, expiryDate: e.target.value })}
                className="w-full bg-carbon-950 border border-carbon-700 rounded-xl px-3 py-2 text-sm text-zinc-100 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">
              Premium Paid (₹)
            </label>
            <input
              type="number"
              value={docForm.premium}
              onChange={(e) => setDocForm({ ...docForm, premium: e.target.value })}
              placeholder="e.g. 1450"
              className="w-full bg-carbon-950 border border-carbon-700 rounded-xl px-3 py-2 text-sm text-zinc-100 font-mono"
            />
          </div>

          <button
            type="submit"
            disabled={!docForm.title || !docForm.expiryDate}
            className="w-full py-3.5 rounded-xl bg-amber-500 text-carbon-950 font-bold text-sm shadow-lg disabled:opacity-50"
          >
            Save Document Record
          </button>
        </form>
      </BottomSheet>

      {/* Renew Document Modal */}
      <BottomSheet
        isOpen={isRenewOpen}
        onClose={() => setIsRenewOpen(false)}
        title={`Renew ${selectedDoc?.title || 'Document'}`}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            renewDocMutation.mutate({
              id: selectedDoc._id,
              data: {
                newExpiryDate: renewForm.newExpiryDate,
                premium: renewForm.premium ? Number(renewForm.premium) : null,
                notes: renewForm.notes,
              },
            });
          }}
          className="space-y-4"
        >
          <div className="p-3 bg-carbon-800 rounded-xl text-xs text-zinc-300">
            Current expiry date on file:{' '}
            <strong>{selectedDoc?.expiryDate ? formatDate(selectedDoc.expiryDate) : '--'}</strong>.
            The previous expiry will be archived in the document renewal history.
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">
              New Expiry Date *
            </label>
            <input
              type="date"
              required
              value={renewForm.newExpiryDate}
              onChange={(e) => setRenewForm({ ...renewForm, newExpiryDate: e.target.value })}
              className="w-full bg-carbon-950 border border-carbon-700 rounded-xl px-3 py-2 text-sm text-zinc-100 font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">
              Renewal Premium (₹)
            </label>
            <input
              type="number"
              value={renewForm.premium}
              onChange={(e) => setRenewForm({ ...renewForm, premium: e.target.value })}
              placeholder="e.g. 1500"
              className="w-full bg-carbon-950 border border-carbon-700 rounded-xl px-3 py-2 text-sm text-zinc-100 font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">
              Renewal Notes
            </label>
            <input
              type="text"
              value={renewForm.notes}
              onChange={(e) => setRenewForm({ ...renewForm, notes: e.target.value })}
              placeholder="e.g. 1-year renewal via Digit with zero dep"
              className="w-full bg-carbon-950 border border-carbon-700 rounded-xl px-3 py-2 text-sm text-zinc-100 font-sans"
            />
          </div>

          <button
            type="submit"
            disabled={!renewForm.newExpiryDate}
            className="w-full py-3.5 rounded-xl bg-amber-500 text-carbon-950 font-bold text-sm shadow-lg disabled:opacity-50"
          >
            Confirm Document Renewal
          </button>
        </form>
      </BottomSheet>
    </div>
  );
}
