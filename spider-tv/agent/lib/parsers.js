// Pure parsers for command output. Kept side-effect free so they are unit-testable on any OS.

/** `df -kP` → [{ device, mount, totalBytes, usedBytes, freeBytes }] for block devices only. */
export function parseDf(text) {
  const out = [];
  for (const line of text.trim().split('\n').slice(1)) {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 6) continue;
    const [device, total, used, avail] = parts;
    const mount = parts.slice(5).join(' ');
    if (!device.startsWith('/dev/')) continue;
    // macOS exposes the sealed system snapshot and helper volumes; the user cares about Data + external.
    if (/^\/System\/Volumes\/(?!Data$)/.test(mount) || mount.startsWith('/private/var/vm')) continue;
    if (mount.startsWith('/boot') || mount.startsWith('/snap/')) continue;
    out.push({
      device,
      mount,
      totalBytes: Number(total) * 1024,
      usedBytes: Number(used) * 1024,
      freeBytes: Number(avail) * 1024,
    });
  }
  return out;
}

/** `wpctl get-volume @DEFAULT_AUDIO_SINK@` → "Volume: 0.45 [MUTED]" */
export function parseWpctl(text) {
  const m = /Volume:\s*([\d.]+)/.exec(text);
  if (!m) return null;
  return { level: Math.round(Number(m[1]) * 100), muted: /\[MUTED\]/.test(text) };
}

/** `amixer get Master` → "... [45%] [on]" */
export function parseAmixer(text) {
  const m = /\[(\d+)%\](?:.*?\[(on|off)\])?/.exec(text);
  if (!m) return null;
  return { level: Number(m[1]), muted: m[2] === 'off' };
}

/** macOS `osascript -e 'get volume settings'` → "output volume:45, input volume:50, alert volume:100, output muted:false" */
export function parseMacVolume(text) {
  const level = /output volume:(\d+|missing value)/.exec(text);
  const muted = /output muted:(true|false)/.exec(text);
  if (!level || level[1] === 'missing value') return null;
  return { level: Number(level[1]), muted: muted?.[1] === 'true' };
}

/** Splits an nmcli terse line, honouring `\:` escapes. */
function splitTerse(line) {
  const fields = [];
  let cur = '';
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '\\' && i + 1 < line.length) {
      cur += line[++i];
    } else if (c === ':') {
      fields.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  fields.push(cur);
  return fields;
}

/** `nmcli -t -f ACTIVE,SSID,SIGNAL,SECURITY dev wifi list` */
export function parseNmcliWifi(text) {
  const seen = new Map();
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    const [active, ssid, signal, security] = splitTerse(line);
    if (!ssid) continue;
    const entry = { ssid, active: active === 'yes', signal: Number(signal) || 0, secure: !!security && security !== '--' };
    const prev = seen.get(ssid);
    if (!prev || entry.active || (!prev.active && entry.signal > prev.signal)) seen.set(ssid, entry);
  }
  return [...seen.values()].sort((a, b) => Number(b.active) - Number(a.active) || b.signal - a.signal);
}

/** macOS `networksetup -getairportnetwork en0` → "Current Wi-Fi Network: Home" */
export function parseAirportNetwork(text) {
  const m = /Current Wi-Fi Network:\s*(.+)/.exec(text);
  return m ? m[1].trim() : null;
}

/** `bluetoothctl devices` → "Device AA:BB:CC:DD:EE:FF Name" */
export function parseBluetoothctlDevices(text) {
  const out = [];
  for (const line of text.split('\n')) {
    const m = /^Device\s+([0-9A-F:]{17})\s+(.+)$/i.exec(line.trim());
    if (m) out.push({ address: m[1], name: m[2] });
  }
  return out;
}

/** `bluetoothctl show` → { powered } */
export function parseBluetoothctlShow(text) {
  if (!/Controller/.test(text)) return null;
  const powered = /Powered:\s*(yes|no)/.exec(text);
  return { powered: powered?.[1] === 'yes' };
}

/** macOS `system_profiler SPBluetoothDataType -json` */
export function parseMacBluetooth(json) {
  const root = json?.SPBluetoothDataType?.[0];
  if (!root) return null;
  const powered = root.controller_properties?.controller_state === 'attrib_on';
  const devices = [];
  for (const [group, connected] of [
    ['device_connected', true],
    ['device_not_connected', false],
  ]) {
    for (const item of root[group] ?? []) {
      for (const [name, info] of Object.entries(item)) {
        devices.push({ name, address: info.device_address ?? '', connected });
      }
    }
  }
  return { powered, devices };
}
