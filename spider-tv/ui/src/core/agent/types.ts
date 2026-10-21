import type catalogJson from '@shared/catalog.json';

export type CatalogApp = (typeof catalogJson)['apps'][number] & { route?: string; userAgent?: string; url?: string };

export interface Capabilities {
  platform: string;
  browser: string | null;
  volume: boolean;
  wifiScan: boolean;
  bluetooth: boolean;
  thumbnails: boolean;
  airplay: boolean;
  mediaDirs: string[];
}

export interface SystemInfo {
  hostname: string;
  os: string;
  platform: string;
  arch: string;
  model: string | null;
  cpu: string;
  cpuCores: number;
  memTotalBytes: number;
  memFreeBytes: number;
  uptimeSec: number;
  node: string;
  agentVersion: string;
}

export interface NetworkInfo {
  online: boolean;
  latencyMs: number | null;
  interfaces: { name: string; address: string; mac: string }[];
  wifi: { supported: boolean; canScan: boolean; ssid: string | null; networks: { ssid: string; active: boolean; signal: number; secure: boolean }[] };
}

export interface Volume {
  supported: boolean;
  backend: string | null;
  level?: number;
  muted?: boolean;
}

export interface BluetoothInfo {
  supported: boolean;
  available: boolean;
  powered: boolean;
  canPair: boolean;
  devices: { name: string; address: string; connected: boolean | null }[];
}

export interface StorageInfo {
  volumes: { device: string; mount: string; totalBytes: number; usedBytes: number; freeBytes: number }[];
  mediaDirs: string[];
  fileRoots: string[];
}

export interface MediaItem {
  id: string;
  title: string;
  folder: string | null;
  ext: string;
  sizeBytes: number;
  modifiedAt: number;
  browserPlayable: boolean;
}

export interface ProgressItem {
  id: string;
  position: number;
  duration: number;
  title: string;
  updatedAt: number;
}

export interface DirEntry {
  id: string;
  name: string;
  type: 'dir' | 'file';
  kind: 'root' | 'dir' | 'video' | 'audio' | 'image' | 'other';
  sizeBytes?: number;
}

export interface DirListing {
  path: string | null;
  parent: string | null;
  entries: DirEntry[];
}

export interface MirroringInfo {
  airplay: { installed: boolean; running: boolean; name: string; lastError: string | null };
  miracast: { installed: boolean; supported: boolean };
}
