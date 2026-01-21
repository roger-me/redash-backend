// Device Fingerprint Generator and Spoofing
// Creates unique, persistent fingerprints per profile to appear as real Android devices

export interface DeviceFingerprint {
  // Device info
  deviceModel: string;
  deviceVendor: string;
  platform: string;

  // Hardware
  hardwareConcurrency: number;
  deviceMemory: number;
  maxTouchPoints: number;

  // Screen
  screenWidth: number;
  screenHeight: number;
  availWidth: number;
  availHeight: number;
  colorDepth: number;
  pixelRatio: number;

  // WebGL
  webglVendor: string;
  webglRenderer: string;

  // Canvas noise seed (for consistent noise)
  canvasNoiseSeed: number;

  // Audio noise seed
  audioNoiseSeed: number;

  // Battery
  batteryLevel: number;
  batteryCharging: boolean;

  // Timezone (should match proxy location ideally)
  timezone: string;

  // Language
  language: string;
  languages: string[];

  // Misc
  doNotTrack: string | null;
  cookieEnabled: boolean;
}

// Realistic Android device configurations
const ANDROID_DEVICES = [
  {
    model: 'Pixel 7',
    vendor: 'Google',
    screen: { width: 1080, height: 2400, pixelRatio: 2.625 },
    gpu: { vendor: 'Qualcomm', renderer: 'Adreno (TM) 730' },
  },
  {
    model: 'Pixel 7 Pro',
    vendor: 'Google',
    screen: { width: 1440, height: 3120, pixelRatio: 3.5 },
    gpu: { vendor: 'Qualcomm', renderer: 'Adreno (TM) 730' },
  },
  {
    model: 'Pixel 6',
    vendor: 'Google',
    screen: { width: 1080, height: 2400, pixelRatio: 2.625 },
    gpu: { vendor: 'ARM', renderer: 'Mali-G78' },
  },
  {
    model: 'SM-S918B',
    vendor: 'Samsung',
    screen: { width: 1440, height: 3088, pixelRatio: 3.0 },
    gpu: { vendor: 'ARM', renderer: 'Mali-G715' },
  },
  {
    model: 'SM-S911B',
    vendor: 'Samsung',
    screen: { width: 1080, height: 2340, pixelRatio: 2.625 },
    gpu: { vendor: 'Qualcomm', renderer: 'Adreno (TM) 740' },
  },
  {
    model: 'SM-A546B',
    vendor: 'Samsung',
    screen: { width: 1080, height: 2340, pixelRatio: 2.0 },
    gpu: { vendor: 'ARM', renderer: 'Mali-G68' },
  },
  {
    model: 'M2101K6G',
    vendor: 'Xiaomi',
    screen: { width: 1080, height: 2400, pixelRatio: 2.75 },
    gpu: { vendor: 'Qualcomm', renderer: 'Adreno (TM) 650' },
  },
  {
    model: '22011211G',
    vendor: 'Xiaomi',
    screen: { width: 1220, height: 2712, pixelRatio: 2.75 },
    gpu: { vendor: 'Qualcomm', renderer: 'Adreno (TM) 730' },
  },
  {
    model: 'CPH2451',
    vendor: 'OPPO',
    screen: { width: 1080, height: 2400, pixelRatio: 2.5 },
    gpu: { vendor: 'Qualcomm', renderer: 'Adreno (TM) 619' },
  },
  {
    model: 'V2227A',
    vendor: 'vivo',
    screen: { width: 1080, height: 2400, pixelRatio: 2.5 },
    gpu: { vendor: 'Qualcomm', renderer: 'Adreno (TM) 642L' },
  },
];

// Country to timezone mapping
const COUNTRY_TIMEZONES: Record<string, string[]> = {
  // North America
  'US': ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles'],
  'USA': ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles'],
  'CA': ['America/Toronto', 'America/Vancouver'],
  'MX': ['America/Mexico_City'],
  // Europe
  'GB': ['Europe/London'],
  'UK': ['Europe/London'],
  'DE': ['Europe/Berlin'],
  'FR': ['Europe/Paris'],
  'ES': ['Europe/Madrid'],
  'IT': ['Europe/Rome'],
  'NL': ['Europe/Amsterdam'],
  'BE': ['Europe/Brussels'],
  'SE': ['Europe/Stockholm'],
  'NO': ['Europe/Oslo'],
  'DK': ['Europe/Copenhagen'],
  'FI': ['Europe/Helsinki'],
  'PL': ['Europe/Warsaw'],
  'AT': ['Europe/Vienna'],
  'CH': ['Europe/Zurich'],
  'PT': ['Europe/Lisbon'],
  'IE': ['Europe/Dublin'],
  'RU': ['Europe/Moscow'],
  // Asia
  'JP': ['Asia/Tokyo'],
  'KR': ['Asia/Seoul'],
  'CN': ['Asia/Shanghai'],
  'IN': ['Asia/Kolkata'],
  'SG': ['Asia/Singapore'],
  'AU': ['Australia/Sydney', 'Australia/Melbourne'],
  'NZ': ['Pacific/Auckland'],
  // South America
  'BR': ['America/Sao_Paulo'],
  'AR': ['America/Buenos_Aires'],
  'CL': ['America/Santiago'],
  'CO': ['America/Bogota'],
};

const DEFAULT_TIMEZONES = ['America/New_York', 'America/Chicago', 'America/Los_Angeles'];

const LANGUAGES = [
  { lang: 'en-US', langs: ['en-US', 'en'] },
];

// Generate a random number with seed for consistency
function seededRandom(seed: number): () => number {
  return function() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

// Generate a unique fingerprint based on a seed (profile ID hash)
export function generateFingerprint(profileId: string, country?: string): DeviceFingerprint {
  // Create a numeric seed from the profile ID
  let seed = 0;
  for (let i = 0; i < profileId.length; i++) {
    seed = ((seed << 5) - seed) + profileId.charCodeAt(i);
    seed = seed & seed;
  }
  seed = Math.abs(seed);

  const random = seededRandom(seed);

  // Pick a device
  const device = ANDROID_DEVICES[Math.floor(random() * ANDROID_DEVICES.length)];

  // Pick timezone based on country, or default to US
  const countryUpper = country?.toUpperCase() || '';
  const timezones = COUNTRY_TIMEZONES[countryUpper] || DEFAULT_TIMEZONES;
  const timezone = timezones[Math.floor(random() * timezones.length)];
  const langConfig = LANGUAGES[Math.floor(random() * LANGUAGES.length)];

  // Generate hardware specs with some variance
  const coreOptions = [4, 6, 8];
  const memoryOptions = [4, 6, 8];

  const fingerprint: DeviceFingerprint = {
    // Device
    deviceModel: device.model,
    deviceVendor: device.vendor,
    platform: 'Linux armv8l',

    // Hardware
    hardwareConcurrency: coreOptions[Math.floor(random() * coreOptions.length)],
    deviceMemory: memoryOptions[Math.floor(random() * memoryOptions.length)],
    maxTouchPoints: 5,

    // Screen
    screenWidth: device.screen.width,
    screenHeight: device.screen.height,
    availWidth: device.screen.width,
    availHeight: device.screen.height - Math.floor(random() * 100 + 50), // Status bar
    colorDepth: 24,
    pixelRatio: device.screen.pixelRatio,

    // WebGL
    webglVendor: device.gpu.vendor,
    webglRenderer: device.gpu.renderer,

    // Noise seeds (unique per profile, consistent across sessions)
    canvasNoiseSeed: Math.floor(random() * 1000000),
    audioNoiseSeed: Math.floor(random() * 1000000),

    // Battery (randomized but consistent)
    batteryLevel: Math.floor(random() * 60 + 30) / 100, // 30-90%
    batteryCharging: random() > 0.7,

    // Locale
    timezone,
    language: langConfig.lang,
    languages: langConfig.langs,

    // Misc
    doNotTrack: random() > 0.8 ? '1' : null,
    cookieEnabled: true,
  };

  return fingerprint;
}

// Generate the JavaScript code to inject for fingerprint spoofing
export function generateSpoofingScript(fp: DeviceFingerprint): string {
  return `
(function() {
  // Prevent double injection
  if (window.__fingerprintSpoofed) return;
  window.__fingerprintSpoofed = true;

  const fp = ${JSON.stringify(fp)};

  // ===== Navigator Properties =====
  const navigatorProps = {
    platform: { value: fp.platform },
    hardwareConcurrency: { value: fp.hardwareConcurrency },
    deviceMemory: { value: fp.deviceMemory },
    maxTouchPoints: { value: fp.maxTouchPoints },
    language: { value: fp.language },
    languages: { value: Object.freeze([...fp.languages]) },
    doNotTrack: { value: fp.doNotTrack },
    cookieEnabled: { value: fp.cookieEnabled },
    vendor: { value: 'Google Inc.' },
    appVersion: { value: '5.0 (Linux; Android 13; ' + fp.deviceModel + ') AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36' },
    userAgent: { value: 'Mozilla/5.0 (Linux; Android 13; ' + fp.deviceModel + ') AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36' },
  };

  for (const [prop, descriptor] of Object.entries(navigatorProps)) {
    try {
      Object.defineProperty(Navigator.prototype, prop, {
        get: () => descriptor.value,
        configurable: true,
      });
    } catch (e) {}
  }

  // ===== Screen Properties =====
  const screenProps = {
    width: fp.screenWidth,
    height: fp.screenHeight,
    availWidth: fp.availWidth,
    availHeight: fp.availHeight,
    colorDepth: fp.colorDepth,
    pixelDepth: fp.colorDepth,
  };

  for (const [prop, value] of Object.entries(screenProps)) {
    try {
      Object.defineProperty(Screen.prototype, prop, {
        get: () => value,
        configurable: true,
      });
    } catch (e) {}
  }

  // Device pixel ratio
  Object.defineProperty(window, 'devicePixelRatio', {
    get: () => fp.pixelRatio,
    configurable: true,
  });

  // ===== WebGL Fingerprint =====
  const originalGetParameter = WebGLRenderingContext.prototype.getParameter;
  WebGLRenderingContext.prototype.getParameter = function(param) {
    // UNMASKED_VENDOR_WEBGL
    if (param === 37445) return fp.webglVendor;
    // UNMASKED_RENDERER_WEBGL
    if (param === 37446) return fp.webglRenderer;
    return originalGetParameter.call(this, param);
  };

  const originalGetParameter2 = WebGL2RenderingContext.prototype.getParameter;
  WebGL2RenderingContext.prototype.getParameter = function(param) {
    if (param === 37445) return fp.webglVendor;
    if (param === 37446) return fp.webglRenderer;
    return originalGetParameter2.call(this, param);
  };

  // ===== Canvas Fingerprint Noise =====
  const noiseSeed = fp.canvasNoiseSeed;
  let noiseIdx = 0;
  function noise() {
    noiseIdx++;
    const x = Math.sin(noiseSeed + noiseIdx) * 10000;
    return (x - Math.floor(x)) * 0.01 - 0.005; // Small noise: -0.005 to 0.005
  }

  const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
  HTMLCanvasElement.prototype.toDataURL = function(type, quality) {
    const ctx = this.getContext('2d');
    if (ctx && this.width > 0 && this.height > 0) {
      try {
        const imageData = ctx.getImageData(0, 0, Math.min(this.width, 10), Math.min(this.height, 10));
        for (let i = 0; i < imageData.data.length; i += 4) {
          imageData.data[i] = Math.max(0, Math.min(255, imageData.data[i] + noise() * 2));
        }
        ctx.putImageData(imageData, 0, 0);
      } catch (e) {}
    }
    return originalToDataURL.call(this, type, quality);
  };

  // ===== Touch Support =====
  Object.defineProperty(window, 'ontouchstart', {
    value: null,
    writable: true,
    configurable: true,
  });

  Object.defineProperty(Navigator.prototype, 'msMaxTouchPoints', {
    get: () => fp.maxTouchPoints,
    configurable: true,
  });

  // ===== Battery API =====
  if (navigator.getBattery) {
    const fakeBattery = {
      charging: fp.batteryCharging,
      chargingTime: fp.batteryCharging ? Math.floor(Math.random() * 3600) : Infinity,
      dischargingTime: fp.batteryCharging ? Infinity : Math.floor(Math.random() * 14400 + 3600),
      level: fp.batteryLevel,
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => true,
    };

    navigator.getBattery = () => Promise.resolve(fakeBattery);
  }

  // ===== Timezone =====
  const originalDateTimeFormat = Intl.DateTimeFormat;
  Intl.DateTimeFormat = function(locales, options) {
    options = options || {};
    if (!options.timeZone) {
      options.timeZone = fp.timezone;
    }
    return new originalDateTimeFormat(locales, options);
  };
  Intl.DateTimeFormat.prototype = originalDateTimeFormat.prototype;
  Intl.DateTimeFormat.supportedLocalesOf = originalDateTimeFormat.supportedLocalesOf;

  // Override Date.prototype.getTimezoneOffset based on timezone
  // This is a simplified version - timezone offset varies by date
  const tzOffsets = {
    'America/New_York': 300,
    'America/Chicago': 360,
    'America/Denver': 420,
    'America/Los_Angeles': 480,
    'America/Phoenix': 420,
    'America/Detroit': 300,
    'America/Indianapolis': 300,
    'America/Kentucky/Louisville': 300,
  };

  const originalGetTimezoneOffset = Date.prototype.getTimezoneOffset;
  Date.prototype.getTimezoneOffset = function() {
    return tzOffsets[fp.timezone] || originalGetTimezoneOffset.call(this);
  };

  // ===== Audio Fingerprint =====
  const originalCreateOscillator = AudioContext.prototype.createOscillator;
  AudioContext.prototype.createOscillator = function() {
    const oscillator = originalCreateOscillator.call(this);
    const originalConnect = oscillator.connect.bind(oscillator);
    oscillator.connect = function(destination) {
      if (destination instanceof AnalyserNode) {
        // Add slight frequency variation for unique audio fingerprint
        oscillator.frequency.value += (fp.audioNoiseSeed % 10) * 0.0001;
      }
      return originalConnect(destination);
    };
    return oscillator;
  };

  // ===== Plugins (empty for mobile) =====
  Object.defineProperty(Navigator.prototype, 'plugins', {
    get: () => {
      const arr = [];
      arr.item = () => null;
      arr.namedItem = () => null;
      arr.refresh = () => {};
      return arr;
    },
    configurable: true,
  });

  Object.defineProperty(Navigator.prototype, 'mimeTypes', {
    get: () => {
      const arr = [];
      arr.item = () => null;
      arr.namedItem = () => null;
      return arr;
    },
    configurable: true,
  });

  // ===== Connection API =====
  if ('connection' in navigator) {
    const connectionProps = {
      effectiveType: '4g',
      rtt: 50 + Math.floor(fp.canvasNoiseSeed % 50),
      downlink: 10 + (fp.canvasNoiseSeed % 20),
      saveData: false,
    };

    for (const [prop, value] of Object.entries(connectionProps)) {
      try {
        Object.defineProperty(navigator.connection, prop, {
          get: () => value,
          configurable: true,
        });
      } catch (e) {}
    }
  }

  console.log('[Fingerprint] Spoofing active for device:', fp.deviceModel);
})();
`;
}
