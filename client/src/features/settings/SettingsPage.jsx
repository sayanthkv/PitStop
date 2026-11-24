import { useState, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth.jsx';
import { useVehicle } from '../../hooks/useVehicle.js';
import { api } from '../../lib/api.js';
import { APP_CONFIG } from '../../lib/constants.js';
import { BottomSheet } from '../../components/common/BottomSheet.jsx';
import {
  Settings,
  Download,
  Upload,
  FileText,
  Lock,
  Trash2,
  LogOut,
  ShieldCheck,
  Check,
} from 'lucide-react';

export function SettingsPage() {
  const { logout } = useAuth();
  const { vehicle, updateVehicle } = useVehicle();

  // Settings states
  const [vehicleForm, setVehicleForm] = useState({
    nickname: vehicle?.nickname || 'My NTORQ',
    tankCapacity: vehicle?.tankCapacity || APP_CONFIG.defaultTankCapacity,
    reserveLevel: vehicle?.reserveLevel || APP_CONFIG.defaultReserveLevel,
    registrationNumber: vehicle?.registrationNumber || '',
  });

  // Password modal
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '' });
  const [pwMessage, setPwMessage] = useState('');
  const [pwError, setPwError] = useState('');

  // Backup & Import
  const [importPreview, setImportPreview] = useState(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importStatus, setImportStatus] = useState('');
  const fileInputRef = useRef(null);

  // Status updates
  const [vehicleSaved, setVehicleSaved] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isDownloadingCsv, setIsDownloadingCsv] = useState(false);

  const handleSaveVehicle = async (e) => {
    e.preventDefault();
    await updateVehicle({
      nickname: vehicleForm.nickname,
      tankCapacity: Number(vehicleForm.tankCapacity),
      reserveLevel: Number(vehicleForm.reserveLevel),
      registrationNumber: vehicleForm.registrationNumber,
    });
    setVehicleSaved(true);
    setTimeout(() => setVehicleSaved(false), 3000);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwMessage('');
    setPwError('');
    try {
      await api.post('/auth/change-password', pwForm);
      setPwMessage('Password updated successfully.');
      setPwForm({ currentPassword: '', newPassword: '' });
    } catch (err) {
      setPwError(err.message || 'Failed to change password');
    }
  };

  const handleExportBackup = async () => {
    try {
      const res = await api.get('/backup/export');
      const blob = new Blob([JSON.stringify(res, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ntorq_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
    } catch (err) {
      alert(`Export failed: ${err.message}`);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target.result);
        const previewRes = await api.post('/backup/import', { backup: json, dryRun: true });
        setImportPreview({ data: json, stats: previewRes.preview });
        setIsImportModalOpen(true);
      } catch (err) {
        alert(`Invalid backup JSON file: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = async () => {
    if (!importPreview?.data) return;
    try {
      setImportStatus('Restoring and deduplicating records...');
      const res = await api.post('/backup/import', { backup: importPreview.data, dryRun: false });
      setImportStatus(res.message);
      setTimeout(() => {
        setIsImportModalOpen(false);
        setImportPreview(null);
        window.location.reload();
      }, 1500);
    } catch (err) {
      setImportStatus(`Import error: ${err.message}`);
    }
  };

  const handleDownloadPdf = async () => {
    setIsDownloadingPdf(true);
    try {
      const blob = await api.get('/reports/pdf');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `NTORQ_Companion_Report_${vehicle?.registrationNumber || 'Scooter'}.pdf`;
      a.click();
    } catch (err) {
      alert(`Report download error: ${err.message}`);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleDownloadCsv = async () => {
    setIsDownloadingCsv(true);
    try {
      const blob = await api.get('/reports/csv');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `NTORQ_Companion_Export_${vehicle?.registrationNumber || 'Data'}.csv`;
      a.click();
    } catch (err) {
      alert(`CSV export error: ${err.message}`);
    } finally {
      setIsDownloadingCsv(false);
    }
  };

  const handleEraseLocationData = async () => {
    if (
      window.confirm(
        'Are you sure you want to permanently erase all GPS track routes and parking spot coordinates? Summary ride statistics (km, time, speeds) will be kept.'
      )
    ) {
      try {
        const res = await api.delete('/rides');
        alert(res.message);
      } catch (err) {
        alert(err.message || 'Failed to erase location data');
      }
    }
  };

  return (
    <div className="space-y-4 pb-24 pt-2 px-4 max-w-md mx-auto">
      {/* Vehicle Telemetry Parameters Card */}
      <div className="bg-carbon-900 border border-carbon-800 rounded-2xl p-5 shadow-xl">
        <h3 className="font-display font-bold text-base text-zinc-100 uppercase tracking-wide mb-3 flex items-center gap-2">
          <Settings className="w-5 h-5 text-amber-500" /> Scooter Settings
        </h3>

        <form onSubmit={handleSaveVehicle} className="space-y-3">
          <div>
            <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">
              Scooter Nickname
            </label>
            <input
              type="text"
              value={vehicleForm.nickname}
              onChange={(e) => setVehicleForm({ ...vehicleForm, nickname: e.target.value })}
              className="w-full bg-carbon-950 border border-carbon-700 rounded-xl px-3 py-2 text-sm text-zinc-100 font-sans"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">
              Registration Number
            </label>
            <input
              type="text"
              value={vehicleForm.registrationNumber}
              onChange={(e) => setVehicleForm({ ...vehicleForm, registrationNumber: e.target.value.toUpperCase() })}
              className="w-full bg-carbon-950 border border-carbon-700 rounded-xl px-3 py-2 text-sm font-mono text-amber-400 uppercase"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">
                Tank Capacity (L)
              </label>
              <input
                type="number"
                step="0.1"
                min="1"
                value={vehicleForm.tankCapacity}
                onChange={(e) => setVehicleForm({ ...vehicleForm, tankCapacity: e.target.value })}
                className="w-full bg-carbon-950 border border-carbon-700 rounded-xl px-3 py-2 text-sm text-zinc-100 font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">
                Reserve Level (L)
              </label>
              <input
                type="number"
                step="0.1"
                min="0.2"
                value={vehicleForm.reserveLevel}
                onChange={(e) => setVehicleForm({ ...vehicleForm, reserveLevel: e.target.value })}
                className="w-full bg-carbon-950 border border-carbon-700 rounded-xl px-3 py-2 text-sm text-zinc-100 font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-amber-500 text-carbon-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow transition"
          >
            {vehicleSaved ? <Check className="w-4 h-4 stroke-[3]" /> : null}
            {vehicleSaved ? 'Saved' : 'Save Scooter Parameters'}
          </button>
        </form>
      </div>

      {/* Reports Generation Card */}
      <div className="bg-carbon-900 border border-carbon-800 rounded-2xl p-5 shadow-xl">
        <h4 className="font-display font-bold text-sm text-zinc-100 uppercase tracking-wide mb-1 flex items-center gap-2">
          <FileText className="w-4 h-4 text-cyan-400" /> Export Reports (Resale & Audit)
        </h4>
        <p className="text-[11px] text-zinc-400 font-sans mb-3">
          Download PDF dossier or CSV spreadsheet of all fuel refills, service records, and expenses.
        </p>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleDownloadPdf}
            disabled={isDownloadingPdf}
            className="py-2.5 px-3 rounded-xl bg-carbon-800 hover:bg-carbon-700 text-zinc-200 text-xs font-mono border border-carbon-700 flex items-center justify-center gap-1.5 transition"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            {isDownloadingPdf ? 'Generating...' : 'PDF Dossier'}
          </button>

          <button
            onClick={handleDownloadCsv}
            disabled={isDownloadingCsv}
            className="py-2.5 px-3 rounded-xl bg-carbon-800 hover:bg-carbon-700 text-zinc-200 text-xs font-mono border border-carbon-700 flex items-center justify-center gap-1.5 transition"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            {isDownloadingCsv ? 'Exporting...' : 'CSV Report'}
          </button>
        </div>
      </div>

      {/* Full Backup & Restore */}
      <div className="bg-carbon-900 border border-carbon-800 rounded-2xl p-5 shadow-xl">
        <h4 className="font-display font-bold text-sm text-zinc-100 uppercase tracking-wide mb-1 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" /> Full Data Backup & Restore
        </h4>
        <p className="text-[11px] text-zinc-400 font-sans mb-3">
          Export your complete database as a single JSON file, or restore from a previous backup with automatic deduplication.
        </p>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept=".json"
          className="hidden"
        />

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleExportBackup}
            className="py-2.5 px-3 rounded-xl bg-carbon-800 hover:bg-carbon-700 text-zinc-200 text-xs font-mono border border-carbon-700 flex items-center justify-center gap-1.5 transition"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" /> Export JSON
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="py-2.5 px-3 rounded-xl bg-carbon-800 hover:bg-carbon-700 text-zinc-200 text-xs font-mono border border-carbon-700 flex items-center justify-center gap-1.5 transition"
          >
            <Upload className="w-3.5 h-3.5 text-emerald-400" /> Import JSON
          </button>
        </div>
      </div>

      {/* Security & Privacy Settings */}
      <div className="bg-carbon-900 border border-carbon-800 rounded-2xl p-4 shadow-xl space-y-2">
        <button
          onClick={() => setIsPasswordOpen(true)}
          className="w-full py-3 px-3.5 rounded-xl bg-carbon-950 border border-carbon-800 text-left text-xs font-sans text-zinc-200 flex items-center justify-between hover:border-carbon-700 transition"
        >
          <span className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-500" /> Change Owner Password
          </span>
          <span className="text-zinc-500">&rarr;</span>
        </button>

        <button
          onClick={handleEraseLocationData}
          className="w-full py-3 px-3.5 rounded-xl bg-carbon-950 border border-carbon-800 text-left text-xs font-sans text-rose-400 flex items-center justify-between hover:border-rose-900/50 transition"
        >
          <span className="flex items-center gap-2">
            <Trash2 className="w-4 h-4" /> Erase All Location Data (Privacy)
          </span>
          <span className="text-[10px] font-mono text-zinc-500">Strip GPS</span>
        </button>

        <button
          onClick={logout}
          className="w-full py-3 px-3.5 rounded-xl bg-carbon-950 border border-carbon-800 text-left text-xs font-sans text-zinc-400 flex items-center justify-between hover:text-zinc-100 hover:border-carbon-700 transition"
        >
          <span className="flex items-center gap-2">
            <LogOut className="w-4 h-4" /> Sign Out of Cockpit
          </span>
        </button>
      </div>

      {/* Password Modal */}
      <BottomSheet isOpen={isPasswordOpen} onClose={() => setIsPasswordOpen(false)} title="Change Owner Password">
        <form onSubmit={handleChangePassword} className="space-y-4">
          {pwMessage && (
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 text-xs">
              {pwMessage}
            </div>
          )}
          {pwError && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 text-xs">{pwError}</div>
          )}

          <div>
            <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">
              Current Password
            </label>
            <input
              type="password"
              required
              value={pwForm.currentPassword}
              onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
              className="w-full bg-carbon-950 border border-carbon-700 rounded-xl px-3 py-2 text-sm text-zinc-100 font-sans"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">
              New Password (min 6 characters)
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={pwForm.newPassword}
              onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
              className="w-full bg-carbon-950 border border-carbon-700 rounded-xl px-3 py-2 text-sm text-zinc-100 font-sans"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-amber-500 text-carbon-950 font-bold text-sm shadow"
          >
            Update Password
          </button>
        </form>
      </BottomSheet>

      {/* Backup Import Preview BottomSheet */}
      <BottomSheet
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Restore Backup Preview"
      >
        <div className="space-y-4">
          <p className="text-xs text-zinc-300">
            Validated backup file. The system will import missing records and deduplicate existing ones automatically:
          </p>

          {importPreview?.stats && (
            <div className="p-3 bg-carbon-800 rounded-xl space-y-1 text-xs font-mono">
              <div>Odometer Readings: {importPreview.stats.odometerReadingsCount}</div>
              <div>Fuel Entries: {importPreview.stats.fuelEntriesCount}</div>
              <div>Service Records: {importPreview.stats.serviceEntriesCount}</div>
              <div>Documents: {importPreview.stats.documentsCount}</div>
              <div>Rides: {importPreview.stats.ridesCount}</div>
            </div>
          )}

          {importStatus && (
            <p className="text-xs font-mono text-amber-400">{importStatus}</p>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setIsImportModalOpen(false)}
              className="py-2.5 rounded-xl bg-carbon-800 text-zinc-300 text-xs"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmImport}
              className="py-2.5 rounded-xl bg-emerald-500 text-carbon-950 font-bold text-xs"
            >
              Confirm Restore
            </button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
