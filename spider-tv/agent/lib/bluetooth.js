import { run, which } from './exec.js';
import { parseBluetoothctlDevices, parseBluetoothctlShow, parseMacBluetooth } from './parsers.js';
import { config } from './config.js';

/** Read-only Bluetooth status. Pairing from the TV UI is Phase 2 (needs an agent for PIN/confirm flows). */
export async function bluetoothStatus() {
  if (config.platform === 'linux' && which('bluetoothctl')) {
    const show = await run('bluetoothctl', ['show']);
    const ctrl = show.ok ? parseBluetoothctlShow(show.stdout) : null;
    if (!ctrl) return { supported: true, available: false, powered: false, devices: [], canPair: false };
    const devs = await run('bluetoothctl', ['devices', 'Paired']);
    const devices = parseBluetoothctlDevices(devs.stdout).map((d) => ({ ...d, connected: null }));
    return { supported: true, available: true, powered: ctrl.powered, devices, canPair: false };
  }
  if (config.platform === 'darwin') {
    const r = await run('system_profiler', ['SPBluetoothDataType', '-json'], { timeout: 10000 });
    let parsed = null;
    try {
      parsed = r.ok ? parseMacBluetooth(JSON.parse(r.stdout)) : null;
    } catch {
      parsed = null;
    }
    if (!parsed) return { supported: true, available: false, powered: false, devices: [], canPair: false };
    return { supported: true, available: true, ...parsed, canPair: false };
  }
  return { supported: false, available: false, powered: false, devices: [], canPair: false };
}
