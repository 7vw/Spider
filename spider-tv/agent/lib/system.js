import os from 'node:os';
import { run, which } from './exec.js';
import { parseDf, parseNmcliWifi, parseAirportNetwork } from './parsers.js';
import { config } from './config.js';

export async function systemInfo() {
  const cpus = os.cpus();
  let osName = `${os.type()} ${os.release()}`;
  if (config.platform === 'darwin') {
    const r = await run('sw_vers', ['-productVersion']);
    if (r.ok) osName = `macOS ${r.stdout.trim()}`;
  } else if (config.platform === 'linux') {
    const r = await run('sh', ['-c', '. /etc/os-release 2>/dev/null && echo "$PRETTY_NAME"']);
    if (r.ok && r.stdout.trim()) osName = r.stdout.trim();
  }
  let model = null;
  if (config.platform === 'linux') {
    const r = await run('cat', ['/proc/device-tree/model']);
    if (r.ok) model = r.stdout.replace(/\0/g, '').trim() || null;
  } else if (config.platform === 'darwin') {
    const r = await run('sysctl', ['-n', 'hw.model']);
    if (r.ok) model = r.stdout.trim();
  }
  return {
    hostname: os.hostname(),
    os: osName,
    platform: config.platform,
    arch: os.arch(),
    model,
    cpu: cpus[0]?.model?.trim() ?? 'unknown',
    cpuCores: cpus.length,
    memTotalBytes: os.totalmem(),
    memFreeBytes: os.freemem(),
    uptimeSec: Math.round(os.uptime()),
    loadAvg: os.loadavg(),
    node: process.version,
    agentVersion: config.version,
  };
}

let onlineCache = { at: 0, value: null };

/** Real reachability check (HTTP 204 endpoint), cached for 10 s. */
export async function checkOnline() {
  if (Date.now() - onlineCache.at < 10_000 && onlineCache.value) return onlineCache.value;
  const started = Date.now();
  let online = false;
  try {
    const res = await fetch('http://connectivitycheck.gstatic.com/generate_204', {
      signal: AbortSignal.timeout(3500),
      redirect: 'manual',
    });
    online = res.status === 204 || res.status === 200;
  } catch {
    online = false;
  }
  onlineCache = { at: Date.now(), value: { online, latencyMs: online ? Date.now() - started : null } };
  return onlineCache.value;
}

export async function networkInfo() {
  const interfaces = [];
  for (const [name, addrs] of Object.entries(os.networkInterfaces())) {
    for (const a of addrs ?? []) {
      if (a.internal || a.family !== 'IPv4') continue;
      interfaces.push({ name, address: a.address, mac: a.mac });
    }
  }
  const [online, wifi] = await Promise.all([checkOnline(), wifiStatus()]);
  return { ...online, interfaces, wifi };
}

async function wifiStatus() {
  if (config.platform === 'linux' && which('nmcli')) {
    const r = await run('nmcli', ['-t', '-f', 'ACTIVE,SSID,SIGNAL,SECURITY', 'dev', 'wifi', 'list'], { timeout: 8000 });
    if (r.ok) {
      const networks = parseNmcliWifi(r.stdout);
      return { supported: true, canScan: true, ssid: networks.find((n) => n.active)?.ssid ?? null, networks };
    }
  }
  if (config.platform === 'darwin' && which('networksetup')) {
    const r = await run('networksetup', ['-getairportnetwork', 'en0']);
    // Newer macOS versions hide the SSID from non-entitled processes; report that instead of guessing.
    return { supported: true, canScan: false, ssid: r.ok ? parseAirportNetwork(r.stdout) : null, networks: [] };
  }
  return { supported: false, canScan: false, ssid: null, networks: [] };
}

export async function storageInfo() {
  const r = await run('df', ['-kP']);
  return { volumes: r.ok ? parseDf(r.stdout) : [] };
}
