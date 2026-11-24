import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { ClusterGauge } from '../../components/common/ClusterGauge.jsx';
import {
  Bluetooth,
  BluetoothSearching,
  AlertTriangle,
  Play,
  Pause,
  Trash2,
  RefreshCw,
  Eye,
  ShieldAlert,
} from 'lucide-react';

// Standard Bluetooth SIG GATT service and characteristic names
const SIG_NAMES = {
  '00001800-0000-1000-8000-00805f9b34fb': 'Generic Access',
  '00001801-0000-1000-8000-00805f9b34fb': 'Generic Attribute',
  '0000180f-0000-1000-8000-00805f9b34fb': 'Battery Service',
  '0000180a-0000-1000-8000-00805f9b34fb': 'Device Information',
  '00002a19-0000-1000-8000-00805f9b34fb': 'Battery Level',
  '00002a00-0000-1000-8000-00805f9b34fb': 'Device Name',
  '00002a24-0000-1000-8000-00805f9b34fb': 'Model Number String',
  '00002a25-0000-1000-8000-00805f9b34fb': 'Serial Number String',
  '00002a26-0000-1000-8000-00805f9b34fb': 'Firmware Revision String',
  '00002a28-0000-1000-8000-00805f9b34fb': 'Software Revision String',
  '00002a29-0000-1000-8000-00805f9b34fb': 'Manufacturer Name String',
};

export function BluetoothLabPage() {
  const queryClient = useQueryClient();
  const [isSupported, setIsSupported] = useState(false);
  const [device, setDevice] = useState(null);
  const [server, setServer] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [servicesTree, setServicesTree] = useState([]);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Live Packet Telemetry Log
  const [logEntries, setLogEntries] = useState([]);
  const [isLogPaused, setIsLogPaused] = useState(false);

  // Active decoder state
  const [decoders, setDecoders] = useState([
    {
      characteristicUuid: '',
      label: 'Telemetry Decoder 1',
      offset: 0,
      byteLength: 1,
      isLittleEndian: true,
      scale: 1.0,
      currentValue: 0,
    },
  ]);

  const activeSubscriptionsRef = useRef(new Map());

  // Feature detection
  useEffect(() => {
    setIsSupported(typeof navigator !== 'undefined' && 'bluetooth' in navigator);
  }, []);

  // Fetch saved profiles
  const { data: _savedProfiles = [] } = useQuery({
    queryKey: ['bluetoothProfiles'],
    queryFn: async () => (await api.get('/bluetooth-profiles')).profiles,
  });

  const saveProfileMutation = useMutation({
    mutationFn: (profile) => api.post('/bluetooth-profiles', profile),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bluetoothProfiles'] }),
  });

  const handleScanAndConnect = async () => {
    if (!navigator.bluetooth) {
      setErrorMessage('Web Bluetooth is not supported on this browser or platform.');
      return;
    }

    setErrorMessage('');
    setStatusMessage('Scanning for nearby Bluetooth devices...');
    setIsConnecting(true);

    try {
      // User gesture requestDevice: accept all devices to explore TVS NTORQ BT cluster
      const selectedDevice = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          'battery_service',
          'device_information',
          'generic_access',
          '00001800-0000-1000-8000-00805f9b34fb',
          '00001801-0000-1000-8000-00805f9b34fb',
          '0000180a-0000-1000-8000-00805f9b34fb',
          '0000180f-0000-1000-8000-00805f9b34fb',
        ],
      });

      setDevice(selectedDevice);
      setStatusMessage(`Selected "${selectedDevice.name || 'Unknown Scooter'}". Connecting to GATT server...`);

      selectedDevice.addEventListener('gattserverdisconnected', onDisconnected);

      const gattServer = await selectedDevice.gatt.connect();
      setServer(gattServer);
      setStatusMessage('Connected to GATT. Discovering primary services...');

      const primaryServices = await gattServer.getPrimaryServices().catch(() => []);
      const tree = [];

      for (const service of primaryServices) {
        const characteristics = await service.getCharacteristics().catch(() => []);
        const charList = [];

        for (const char of characteristics) {
          const props = char.properties;
          charList.push({
            uuid: char.uuid,
            name: SIG_NAMES[char.uuid] || 'Custom Characteristic',
            properties: {
              read: props.read,
              notify: props.notify,
              indicate: props.indicate,
              write: props.write || props.writeWithoutResponse,
            },
            characteristicInstance: char,
          });
        }

        tree.push({
          uuid: service.uuid,
          name: SIG_NAMES[service.uuid] || 'Vendor Service',
          characteristics: charList,
        });
      }

      setServicesTree(tree);
      setStatusMessage(`Discovered ${tree.length} accessible services.`);

      // Persist profile
      saveProfileMutation.mutate({
        deviceName: selectedDevice.name || 'NTORQ BLE',
        deviceId: selectedDevice.id,
        serviceUuids: tree.map((s) => s.uuid),
        decoders: decoders.map(({ currentValue: _val, ...d }) => d),
      });
    } catch (err) {
      if (err.name === 'NotFoundError') {
        setStatusMessage('Scan cancelled by user.');
      } else {
        setErrorMessage(`Bluetooth connection failed: ${err.message}`);
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const onDisconnected = () => {
    setStatusMessage('Device disconnected.');
    setServer(null);
    activeSubscriptionsRef.current.clear();
  };

  const handleReconnect = async () => {
    if (!device || !device.gatt) return;
    try {
      setIsConnecting(true);
      setStatusMessage('Reconnecting...');
      const gatt = await device.gatt.connect();
      setServer(gatt);
      setStatusMessage('Reconnected successfully.');
    } catch (err) {
      setErrorMessage(`Reconnect failed: ${err.message}`);
    } finally {
      setIsConnecting(false);
    }
  };

  // READ ONLY characteristic value reading
  const handleReadCharacteristic = async (char) => {
    try {
      const dataView = await char.characteristicInstance.readValue();
      logIncomingPacket(char.uuid, dataView);
    } catch (err) {
      setErrorMessage(`Cannot read characteristic ${char.uuid}: ${err.message}. Authentication or pairing may be required.`);
    }
  };

  // READ ONLY notification subscription
  const handleToggleNotify = async (char) => {
    try {
      const instance = char.characteristicInstance;
      if (activeSubscriptionsRef.current.has(char.uuid)) {
        await instance.stopNotifications();
        activeSubscriptionsRef.current.delete(char.uuid);
        setStatusMessage(`Stopped notifications for ${char.uuid}`);
      } else {
        await instance.startNotifications();
        instance.addEventListener('characteristicvaluechanged', (e) => {
          logIncomingPacket(char.uuid, e.target.value);
        });
        activeSubscriptionsRef.current.set(char.uuid, instance);
        setStatusMessage(`Subscribed to live notifications on ${char.uuid}`);
      }
    } catch (err) {
      setErrorMessage(`Notification subscription error on ${char.uuid}: ${err.message}`);
    }
  };

  const logIncomingPacket = (uuid, dataView) => {
    if (isLogPaused || !dataView) return;

    const length = dataView.byteLength;
    const bytes = [];
    let ascii = '';

    for (let i = 0; i < length; i++) {
      const byte = dataView.getUint8(i);
      bytes.push(byte.toString(16).padStart(2, '0'));
      ascii += byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '.';
    }

    const hex = bytes.join(' ').toUpperCase();

    // Endian views
    const uint8 = length >= 1 ? dataView.getUint8(0) : 0;
    const uint16LE = length >= 2 ? dataView.getUint16(0, true) : null;
    const uint16BE = length >= 2 ? dataView.getUint16(0, false) : null;
    const uint32LE = length >= 4 ? dataView.getUint32(0, true) : null;

    const entry = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toLocaleTimeString(),
      uuid: uuid.slice(0, 8),
      hex,
      ascii,
      uint8,
      uint16LE,
      uint16BE,
      uint32LE,
      rawBytes: bytes,
    };

    setLogEntries((prev) => [entry, ...prev.slice(0, 99)]); // keep last 100 entries

    // Update decoders matching this UUID
    setDecoders((prevDecoders) =>
      prevDecoders.map((dec) => {
        if (dec.characteristicUuid === uuid || !dec.characteristicUuid) {
          try {
            let val = 0;
            if (dec.byteLength === 1 && length > dec.offset) {
              val = dataView.getUint8(dec.offset);
            } else if (dec.byteLength === 2 && length >= dec.offset + 2) {
              val = dataView.getUint16(dec.offset, dec.isLittleEndian);
            } else if (dec.byteLength === 4 && length >= dec.offset + 4) {
              val = dataView.getUint32(dec.offset, dec.isLittleEndian);
            }
            return { ...dec, currentValue: Math.round(val * dec.scale * 10) / 10 };
          } catch {
            return dec;
          }
        }
        return dec;
      })
    );
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(logEntries, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ntorq_ble_log_${Date.now()}.json`;
    a.click();
  };

  const handleExportCsv = () => {
    let csv = 'Timestamp,UUID,RawHex,ASCII,Uint8,Uint16LE,Uint16BE\n';
    logEntries.forEach((e) => {
      csv += `"${e.timestamp}","${e.uuid}","${e.hex}","${e.ascii.replace(/"/g, '""')}",${e.uint8},${e.uint16LE ?? ''},${e.uint16BE ?? ''}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ntorq_ble_log_${Date.now()}.csv`;
    a.click();
  };

  return (
    <div className="space-y-4 pb-24 pt-2 px-4 max-w-md mx-auto">
      {/* Unsupported Browser Friendly Notice */}
      {!isSupported && (
        <div className="bg-amber-950/20 border border-amber-500/40 rounded-2xl p-5 shadow-xl">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-display font-bold text-base text-zinc-100">
                Web Bluetooth Unsupported
              </h3>
              <p className="text-xs text-zinc-300 font-sans mt-1 leading-relaxed">
                The Web Bluetooth API is not supported on this browser (iOS Safari, Firefox). To explore Bluetooth telemetry:
              </p>
              <ul className="text-xs text-zinc-400 font-sans list-disc list-inside mt-2 space-y-1">
                <li>Use Google Chrome or Microsoft Edge on Android.</li>
                <li>Or Chrome / Edge on desktop (Windows, Mac, Linux) over HTTPS.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Safety Disclaimer Banner */}
      <div className="bg-carbon-900 border border-carbon-800 rounded-xl p-3 text-[11px] font-mono text-zinc-400 flex items-start gap-2">
        <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <span>
          <strong>Experimental & Read-Only:</strong> This lab only reads unencrypted telemetry characteristics for exploration. It never sends write packets and does not replace official instrument safety indicators.
        </span>
      </div>

      {errorMessage && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono">
          {errorMessage}
        </div>
      )}

      {/* Connection & Scanner Card */}
      <div className="bg-carbon-900 border border-carbon-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Bluetooth className="w-5 h-5 text-amber-500" />
            <h3 className="font-display font-bold text-base text-zinc-100 uppercase tracking-wide">
              Bluetooth Lab
            </h3>
          </div>
          {server && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Connected
            </span>
          )}
        </div>

        {statusMessage && (
          <p className="text-xs text-zinc-300 font-mono mb-3 p-2 rounded bg-carbon-950 border border-carbon-800">
            {statusMessage}
          </p>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleScanAndConnect}
            disabled={!isSupported || isConnecting}
            className="py-3 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 text-carbon-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-[0.98] transition disabled:opacity-40"
          >
            <BluetoothSearching className="w-4 h-4 stroke-[2.5]" />
            {isConnecting ? 'Scanning...' : 'Scan Scooter'}
          </button>

          <button
            onClick={handleReconnect}
            disabled={!device || isConnecting}
            className="py-3 px-4 rounded-xl bg-carbon-800 text-zinc-200 font-bold text-sm flex items-center justify-center gap-2 border border-carbon-700 active:scale-[0.98] transition disabled:opacity-40"
          >
            <RefreshCw className="w-4 h-4" /> Reconnect
          </button>
        </div>
      </div>

      {/* Live Decoder Gauge Experiment */}
      <div className="bg-carbon-900 border border-carbon-800 rounded-2xl p-4 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-display font-bold text-sm text-zinc-100 uppercase tracking-wide flex items-center gap-2">
            <Eye className="w-4 h-4 text-cyan-400" /> Live Decoder Gauge
          </h4>
          <span className="text-[10px] font-mono text-zinc-400">Byte parser</span>
        </div>

        <div className="flex items-center justify-around py-2">
          <ClusterGauge
            value={decoders[0]?.currentValue || 0}
            max={100}
            size={105}
            strokeWidth={8}
            title={decoders[0]?.label || 'DECODER'}
            unit=""
            color="#06b6d4"
          />
          <div className="space-y-1.5 font-mono text-xs">
            <div>
              <span className="text-[10px] text-zinc-400 block">Decoded Value:</span>
              <span className="text-xl font-bold text-cyan-400 tabular-nums">
                {decoders[0]?.currentValue || 0}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-zinc-400 block">Parsing Config:</span>
              <span className="text-[11px] text-zinc-300">
                Offset {decoders[0]?.offset}, {decoders[0]?.byteLength}B, {decoders[0]?.isLittleEndian ? 'LE' : 'BE'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* GATT Services & Characteristics Tree */}
      {servicesTree.length > 0 && (
        <div className="bg-carbon-900 border border-carbon-800 rounded-2xl p-4 shadow-xl">
          <h4 className="font-display font-bold text-sm text-zinc-100 uppercase tracking-wide mb-3">
            Discovered GATT Services ({servicesTree.length})
          </h4>

          <div className="space-y-3">
            {servicesTree.map((srv) => (
              <div key={srv.uuid} className="p-3 bg-carbon-950 rounded-xl border border-carbon-800">
                <div className="mb-2">
                  <span className="font-display font-bold text-xs text-amber-400 block">
                    {srv.name}
                  </span>
                  <span className="text-[9px] font-mono text-zinc-500 block truncate">
                    UUID: {srv.uuid}
                  </span>
                </div>

                <div className="space-y-1.5 pl-2 border-l border-carbon-800">
                  {srv.characteristics.map((char) => (
                    <div
                      key={char.uuid}
                      className="p-2 bg-carbon-900 rounded-lg flex items-center justify-between text-xs"
                    >
                      <div className="min-w-0 flex-1 mr-2">
                        <span className="font-sans font-medium text-zinc-200 block truncate text-xs">
                          {char.name}
                        </span>
                        <span className="text-[9px] font-mono text-zinc-500 block truncate">
                          {char.uuid}
                        </span>
                        <div className="flex items-center gap-1 mt-1 text-[9px] font-mono text-zinc-400">
                          {char.properties.read && <span className="bg-carbon-800 px-1 rounded">Read</span>}
                          {char.properties.notify && <span className="bg-carbon-800 px-1 rounded text-cyan-400">Notify</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {char.properties.read && (
                          <button
                            onClick={() => handleReadCharacteristic(char)}
                            className="px-2 py-1 rounded bg-carbon-800 hover:bg-carbon-700 text-zinc-200 text-[10px] font-mono"
                          >
                            Read
                          </button>
                        )}
                        {char.properties.notify && (
                          <button
                            onClick={() => handleToggleNotify(char)}
                            className="px-2 py-1 rounded bg-cyan-500/20 text-cyan-300 text-[10px] font-mono hover:bg-cyan-500/30"
                          >
                            Notify
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Live Packet Log with Pause / Clear / Export */}
      <div className="bg-carbon-900 border border-carbon-800 rounded-2xl p-4 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-display font-bold text-sm text-zinc-100 uppercase tracking-wide">
            Live Telemetry Log ({logEntries.length})
          </h4>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsLogPaused(!isLogPaused)}
              className="p-1 rounded bg-carbon-800 text-zinc-300"
              title={isLogPaused ? 'Resume Log' : 'Pause Log'}
            >
              {isLogPaused ? <Play className="w-3.5 h-3.5 text-amber-400" /> : <Pause className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => setLogEntries([])}
              className="p-1 rounded bg-carbon-800 text-zinc-400 hover:text-rose-400"
              title="Clear Log"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleExportJson}
              className="p-1 rounded bg-carbon-800 text-zinc-300 text-[10px] font-mono px-1.5"
              title="Export JSON"
            >
              JSON
            </button>
            <button
              onClick={handleExportCsv}
              className="p-1 rounded bg-carbon-800 text-zinc-300 text-[10px] font-mono px-1.5"
              title="Export CSV"
            >
              CSV
            </button>
          </div>
        </div>

        {logEntries.length === 0 ? (
          <p className="text-xs text-zinc-400 text-center py-6 font-mono">
            No Bluetooth packets captured yet. Read or subscribe to a characteristic above.
          </p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto font-mono text-[11px]">
            {logEntries.map((e) => (
              <div key={e.id} className="p-2 bg-carbon-950 rounded-lg border border-carbon-800/80">
                <div className="flex justify-between text-zinc-500 text-[9px] mb-0.5">
                  <span>{e.timestamp} · UUID {e.uuid}</span>
                  <span className="text-zinc-400">ASCII: {e.ascii}</span>
                </div>
                <div className="text-amber-400 font-bold tracking-wider">{e.hex}</div>
                <div className="flex gap-3 text-[10px] text-zinc-400 mt-1">
                  <span>u8: {e.uint8}</span>
                  {e.uint16LE !== null && <span>u16LE: {e.uint16LE}</span>}
                  {e.uint16BE !== null && <span>u16BE: {e.uint16BE}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
