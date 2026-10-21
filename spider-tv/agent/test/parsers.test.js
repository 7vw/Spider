import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseDf, parseWpctl, parseAmixer, parseMacVolume, parseNmcliWifi, parseAirportNetwork,
  parseBluetoothctlDevices, parseBluetoothctlShow, parseMacBluetooth,
} from '../lib/parsers.js';

test('parseDf keeps block devices and the macOS Data volume', () => {
  const out = parseDf(`Filesystem 1024-blocks Used Available Capacity Mounted on
/dev/disk3s1s1 971350180 10166428 520384836 2% /
devfs 207 207 0 100% /dev
/dev/disk3s6 971350180 2097172 520384836 1% /System/Volumes/VM
/dev/disk3s5 971350180 436567836 520384836 46% /System/Volumes/Data
/dev/disk5s1 488245288 100 488245188 1% /Volumes/My Drive`);
  assert.deepEqual(out.map((v) => v.mount), ['/', '/System/Volumes/Data', '/Volumes/My Drive']);
  assert.equal(out[2].totalBytes, 488245288 * 1024);
});

test('volume parsers', () => {
  assert.deepEqual(parseWpctl('Volume: 0.45 [MUTED]'), { level: 45, muted: true });
  assert.deepEqual(parseWpctl('Volume: 1.00'), { level: 100, muted: false });
  assert.deepEqual(parseAmixer('  Front Left: Playback 26214 [40%] [on]'), { level: 40, muted: false });
  assert.deepEqual(parseMacVolume('output volume:45, input volume:50, alert volume:100, output muted:false'), { level: 45, muted: false });
  assert.equal(parseMacVolume('output volume:missing value, output muted:missing value'), null);
});

test('parseNmcliWifi handles escaped colons, dedupes and sorts', () => {
  const out = parseNmcliWifi('no:Cafe\\:5G:40:WPA2\nyes:Home:70:WPA2\nno:Home:80:WPA2\nno:Open:90:\nno::20:WPA2\n');
  assert.deepEqual(out.map((n) => n.ssid), ['Home', 'Open', 'Cafe:5G']);
  assert.equal(out[0].active, true);
  assert.equal(out[1].secure, false);
});

test('mac wifi + bluetooth parsers', () => {
  assert.equal(parseAirportNetwork('Current Wi-Fi Network: My Home'), 'My Home');
  assert.equal(parseAirportNetwork('You are not associated with an AirPort network.'), null);
  const bt = parseMacBluetooth({
    SPBluetoothDataType: [{
      controller_properties: { controller_state: 'attrib_on' },
      device_connected: [{ 'AirPods': { device_address: 'AA' } }],
      device_not_connected: [{ 'Keyboard': { device_address: 'BB' } }],
    }],
  });
  assert.equal(bt.powered, true);
  assert.deepEqual(bt.devices.map((d) => [d.name, d.connected]), [['AirPods', true], ['Keyboard', false]]);
});

test('bluetoothctl parsers', () => {
  assert.deepEqual(parseBluetoothctlDevices('Device 11:22:33:44:55:66 Remote\nnoise'), [{ address: '11:22:33:44:55:66', name: 'Remote' }]);
  assert.deepEqual(parseBluetoothctlShow('Controller 00:11 (public)\n\tPowered: yes'), { powered: true });
  assert.equal(parseBluetoothctlShow('No default controller available'), null);
});
