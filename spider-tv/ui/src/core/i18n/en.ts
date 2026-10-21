export const en = {
  nav: { home: 'Home', apps: 'Apps', media: 'Media', settings: 'Settings', search: 'Search' },
  common: {
    open: 'Open', close: 'Close', back: 'Back', cancel: 'Cancel', refresh: 'Refresh', on: 'On', off: 'Off',
    yes: 'Yes', no: 'No', unknown: 'Unknown', notAvailable: 'Not available', comingSoon: 'Coming soon',
    loading: 'Loading…', agentOffline: 'System service offline', retry: 'Retry',
    phase: 'Planned for Phase {n}',
  },
  status: { online: 'Online', offline: 'Offline', checking: 'Checking…' },
  home: {
    favorites: 'Favorites', continue: 'Continue Watching', installed: 'Your Apps', library: 'Your Library',
    addFavorites: 'Add favorites', addFavoritesHint: 'Pin the apps you use most from the Apps screen.',
    resume: 'Resume', left: '{t} left', welcome: 'Welcome to SPIDER TV',
    welcomeSub: 'Use the arrow keys to move, Enter to select and Esc to go back.',
  },
  apps: {
    title: 'Apps', subtitle: 'Everything installed on this device, with what really works today.',
    favorite: 'Add to favorites', unfavorite: 'Remove from favorites', launch: 'Open',
    launched: '{name} opened', returnHintMac: 'Press ⌘Q to come back to SPIDER TV.',
    returnHintLinux: 'Close the window to come back to SPIDER TV.',
    noBrowser: 'No Chromium-based browser found. Install Google Chrome or Chromium.',
    openedHere: 'Opened in a new browser tab (system service offline).',
    closeRunning: 'Close running app', running: 'Running',
  },
  support: {
    works: 'Works', 'drm-limited': 'Works · DRM limited', builtin: 'Built in',
    notes: {
      youtube: 'Opens the official YouTube TV interface (youtube.com/tv) in a full-screen browser window using a TV user agent. This is how many DIY TV boxes run YouTube; Google could change it at any time.',
      drm: 'Plays in Chromium through the Widevine DRM module. Browsers get the lowest security level, so streams are usually capped at 720p (sometimes SD). 4K/HDR needs a certified device. Sign in once inside the window.',
      spotify: 'Spotify’s web player needs Widevine too. The better TV path (Phase 2) is a Spotify Connect receiver (librespot), so your phone controls playback.',
      browser: 'A full Chromium browser in full-screen mode. Best with a keyboard or the future phone remote.',
      media: 'Plays videos from your media folder with resume support. Formats are whatever Chromium decodes (H.264, VP9, AV1, HEVC on Mac).',
      files: 'Browse the folders SPIDER TV is allowed to read, and open videos, music and pictures.',
    },
  },
  media: {
    title: 'Media', subtitle: 'Videos from {dirs}', empty: 'No videos yet',
    emptyHint: 'Copy video files into {dirs} and press Refresh.', noDirs: 'No media folder was found. Create a Movies (Mac) or Videos (Linux) folder in your home directory.',
    unplayable: 'This format may not play in the browser', browseFiles: 'Browse files', allVideos: 'All videos',
  },
  files: { title: 'Files', roots: 'Folders', empty: 'This folder is empty', unsupported: 'This file type can’t be opened yet', up: 'Up one level' },
  player: {
    error: 'This video can’t be played', errorHint: 'Chromium can’t decode this file. Native playback with mpv (all codecs, hardware decoding) is planned for Phase 2.',
    paused: 'Paused', seekHint: '← → seek 10s · OK play/pause · Back exit',
  },
  search: {
    title: 'Search', placeholder: 'Search apps, videos and settings', apps: 'Apps', videos: 'Videos', settings: 'Settings',
    none: 'No results for “{q}”', space: 'Space', clear: 'Clear', del: 'Delete', typeHint: 'Type with the on-screen keyboard or your keyboard.',
  },
  settings: {
    title: 'Settings',
    sections: {
      network: 'Network', bluetooth: 'Bluetooth', display: 'Display', audio: 'Audio', storage: 'Storage',
      apps: 'Applications', themes: 'Themes', language: 'Language', mirroring: 'Screen Mirroring',
      system: 'System Information', updates: 'Updates',
    },
    network: {
      internet: 'Internet', latency: 'Latency', interfaces: 'Network interfaces', wifi: 'Wi-Fi network',
      ssidHidden: 'Hidden by macOS privacy settings', networks: 'Nearby networks', scanUnsupported: 'Joining Wi-Fi from the TV is planned for Phase 2 (NetworkManager on Linux). On a Mac, use System Settings.',
      none: 'No active network interface',
    },
    bluetooth: {
      adapter: 'Adapter', powered: 'Powered', devices: 'Paired devices', none: 'No paired devices', unavailable: 'No Bluetooth adapter detected',
      pairing: 'Pairing remotes and headphones from the TV is planned for Phase 2 (BlueZ on Linux).', connected: 'Connected',
    },
    display: {
      resolution: 'Output resolution', scale: 'Pixel ratio', refresh: 'Refresh rate', overscan: 'Screen margins',
      overscanHint: 'Older TVs crop the picture edges. Increase until the frame below is fully visible.',
      reduceMotion: 'Reduce motion', clock24: '24-hour clock', modeHint: 'Changing the HDMI output mode is planned for Phase 3 (on the device, via the compositor).',
    },
    audio: { volume: 'Volume', mute: 'Mute', backend: 'Audio backend', unsupported: 'Volume control isn’t available on this machine.', keys: 'Volume keys on the remote (or + / − on the keyboard) also work.' },
    storage: { volumes: 'Disks', free: '{free} free of {total}', mediaDirs: 'Media folders', fileRoots: 'Readable folders' },
    apps: { hint: 'Favorites appear first on the Home screen.', favorite: 'Favorite' },
    themes: { hint: 'Changes colors, backgrounds and effects across the whole interface.', active: 'Active' },
    language: { hint: 'Arabic uses a right-to-left layout.' },
    mirroring: {
      airplay: 'AirPlay (iPhone, iPad, Mac)', airplayHint: 'Uses UxPlay, an open-source AirPlay mirroring receiver. Install it with: brew install uxplay (Mac) or sudo apt install uxplay (Raspberry Pi OS).',
      notInstalled: 'UxPlay not installed', start: 'Start receiver', stop: 'Stop receiver', running: 'Receiver running as “{name}”',
      android: 'Android', androidHint: 'There is no reliable open-source Miracast or Google Cast receiver. Options under evaluation: scrcpy over Wi-Fi, or apps that speak AirPlay.',
      drm: 'Protected apps (Netflix, Disney+…) block mirroring on purpose; you’ll see a black screen. That is a DRM rule, not a bug.',
    },
    system: {
      device: 'Device', os: 'Operating system', arch: 'Architecture', cpu: 'Processor', memory: 'Memory', uptime: 'Uptime',
      shell: 'SPIDER TV', agent: 'System service', node: 'Runtime', browserForApps: 'Browser for apps', none: 'Not found',
    },
    updates: { current: 'Installed version', hint: 'Automatic updates are planned for Phase 4. For now, update with git pull and npm run build.' },
  },
  themes: {
    classic: { name: 'Classic Spider', desc: 'Red and black' },
    miles: { name: 'Miles Style', desc: 'Black with neon red' },
    symbiote: { name: 'Symbiote', desc: 'Black and white' },
    '2099': { name: 'Spider 2099', desc: 'Deep blue and red' },
  },
  volume: { title: 'Volume', muted: 'Muted' },
  preview: {
    title: 'Design preview',
    body: 'This preview runs without the system service, so system features and your media are not available.',
    launch: 'Opening {name} needs SPIDER TV running on your Mac (npm run tv).',
  },
  units: { b: 'B', kb: 'KB', mb: 'MB', gb: 'GB', tb: 'TB', d: 'd', h: 'h', m: 'm' },
};

type Widen<T> = { [K in keyof T]: T[K] extends string ? string : Widen<T[K]> };
export type Dict = Widen<typeof en>;
