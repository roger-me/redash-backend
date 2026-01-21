// Fingerprint injection preload script
// This runs in the renderer process and injects spoofing code into the main world

const { ipcRenderer, webFrame } = require('electron');

// Get fingerprint data from main process
const fingerprint = ipcRenderer.sendSync('fingerprint:get');

if (fingerprint) {
  const fp = fingerprint;

  // Create the spoofing script that will run in the main world
  const spoofingCode = `
(function() {
  if (window.__fpSpoofed) return;
  window.__fpSpoofed = true;

  const fp = ${JSON.stringify(fp)};

  // ===== Navigator Properties =====
  const navProps = {
    platform: '${fp.platform}',
    hardwareConcurrency: ${fp.hardwareConcurrency},
    deviceMemory: ${fp.deviceMemory},
    maxTouchPoints: ${fp.maxTouchPoints},
    language: '${fp.language}',
    languages: Object.freeze(${JSON.stringify(fp.languages)}),
    doNotTrack: ${fp.doNotTrack ? `'${fp.doNotTrack}'` : 'null'},
    cookieEnabled: true,
    vendor: 'Google Inc.',
  };

  const ua = 'Mozilla/5.0 (Linux; Android 13; ${fp.deviceModel}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

  // Override navigator properties
  for (const [prop, val] of Object.entries(navProps)) {
    try {
      Object.defineProperty(Navigator.prototype, prop, {
        get: () => val,
        configurable: true
      });
    } catch(e) {}
  }

  // User agent
  try {
    Object.defineProperty(Navigator.prototype, 'userAgent', {
      get: () => ua,
      configurable: true
    });
    Object.defineProperty(Navigator.prototype, 'appVersion', {
      get: () => ua.replace('Mozilla/', ''),
      configurable: true
    });
  } catch(e) {}

  // ===== Screen =====
  const screenProps = {
    width: ${fp.screenWidth},
    height: ${fp.screenHeight},
    availWidth: ${fp.availWidth},
    availHeight: ${fp.availHeight},
    colorDepth: ${fp.colorDepth},
    pixelDepth: ${fp.colorDepth}
  };

  for (const [prop, val] of Object.entries(screenProps)) {
    try {
      Object.defineProperty(Screen.prototype, prop, {
        get: () => val,
        configurable: true
      });
    } catch(e) {}
  }

  // Pixel ratio
  try {
    Object.defineProperty(window, 'devicePixelRatio', {
      get: () => ${fp.pixelRatio},
      configurable: true
    });
  } catch(e) {}

  // ===== WebGL =====
  const webglHandler = {
    apply(target, thisArg, args) {
      if (args[0] === 37445) return '${fp.webglVendor}';
      if (args[0] === 37446) return '${fp.webglRenderer}';
      return Reflect.apply(target, thisArg, args);
    }
  };

  try {
    WebGLRenderingContext.prototype.getParameter = new Proxy(
      WebGLRenderingContext.prototype.getParameter, webglHandler
    );
    WebGL2RenderingContext.prototype.getParameter = new Proxy(
      WebGL2RenderingContext.prototype.getParameter, webglHandler
    );
  } catch(e) {}

  // ===== Canvas noise =====
  let noiseIdx = 0;
  const noiseSeed = ${fp.canvasNoiseSeed};
  const noise = () => {
    noiseIdx++;
    const x = Math.sin(noiseSeed + noiseIdx) * 10000;
    return (x - Math.floor(x)) * 0.02 - 0.01;
  };

  const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
  HTMLCanvasElement.prototype.toDataURL = function(type, quality) {
    try {
      const ctx = this.getContext('2d');
      if (ctx && this.width > 0 && this.height > 0) {
        const img = ctx.getImageData(0, 0, Math.min(16, this.width), Math.min(16, this.height));
        for (let i = 0; i < img.data.length; i += 4) {
          img.data[i] = Math.max(0, Math.min(255, img.data[i] + noise() * 2));
        }
        ctx.putImageData(img, 0, 0);
      }
    } catch(e) {}
    return origToDataURL.apply(this, arguments);
  };

  // ===== Touch =====
  try {
    Object.defineProperty(window, 'ontouchstart', { value: null, writable: true, configurable: true });
    window.DocumentTouch = function() {};
  } catch(e) {}

  // ===== Plugins (empty for mobile) =====
  try {
    const emptyPlugins = { length: 0, item: () => null, namedItem: () => null, refresh: () => {} };
    Object.defineProperty(Navigator.prototype, 'plugins', { get: () => emptyPlugins, configurable: true });
    Object.defineProperty(Navigator.prototype, 'mimeTypes', { get: () => emptyPlugins, configurable: true });
  } catch(e) {}

  // ===== Battery =====
  try {
    const battery = {
      charging: ${fp.batteryCharging},
      chargingTime: ${fp.batteryCharging ? 1800 : 'Infinity'},
      dischargingTime: ${fp.batteryCharging ? 'Infinity' : 7200},
      level: ${fp.batteryLevel},
      addEventListener: () => {},
      removeEventListener: () => {},
    };
    navigator.getBattery = () => Promise.resolve(battery);
  } catch(e) {}

  // ===== Timezone =====
  try {
    const targetTimezone = '${fp.timezone}';

    // Timezone offsets (standard time, without DST)
    const tzOffsets = {
      'America/New_York': 300,
      'America/Chicago': 360,
      'America/Denver': 420,
      'America/Los_Angeles': 480,
      'America/Toronto': 300,
      'America/Vancouver': 480,
      'America/Mexico_City': 360,
      'Europe/London': 0,
      'Europe/Berlin': -60,
      'Europe/Paris': -60,
      'Europe/Madrid': -60,
      'Europe/Rome': -60,
      'Europe/Amsterdam': -60,
      'Europe/Brussels': -60,
      'Europe/Stockholm': -60,
      'Europe/Oslo': -60,
      'Europe/Copenhagen': -60,
      'Europe/Helsinki': -120,
      'Europe/Warsaw': -60,
      'Europe/Vienna': -60,
      'Europe/Zurich': -60,
      'Europe/Lisbon': 0,
      'Europe/Dublin': 0,
      'Europe/Moscow': -180,
      'Asia/Tokyo': -540,
      'Asia/Seoul': -540,
      'Asia/Shanghai': -480,
      'Asia/Kolkata': -330,
      'Asia/Singapore': -480,
      'Australia/Sydney': -600,
      'Australia/Melbourne': -600,
      'Pacific/Auckland': -720,
      'America/Sao_Paulo': 180,
      'America/Buenos_Aires': 180,
      'America/Santiago': 240,
      'America/Bogota': 300,
    };

    const originalGetTimezoneOffset = Date.prototype.getTimezoneOffset;
    Date.prototype.getTimezoneOffset = function() {
      return tzOffsets[targetTimezone] !== undefined ? tzOffsets[targetTimezone] : originalGetTimezoneOffset.call(this);
    };

    // Spoof Intl.DateTimeFormat to return correct timezone
    const OriginalDateTimeFormat = Intl.DateTimeFormat;
    Intl.DateTimeFormat = function(locales, options) {
      options = Object.assign({}, options);
      if (!options.timeZone) {
        options.timeZone = targetTimezone;
      }
      return new OriginalDateTimeFormat(locales, options);
    };
    Intl.DateTimeFormat.prototype = OriginalDateTimeFormat.prototype;
    Intl.DateTimeFormat.supportedLocalesOf = OriginalDateTimeFormat.supportedLocalesOf.bind(OriginalDateTimeFormat);
  } catch(e) {}

  // ===== Client Hints API (userAgentData) =====
  try {
    const brands = [
      { brand: 'Android WebView', version: '120' },
      { brand: 'Chromium', version: '120' },
      { brand: 'Not_A Brand', version: '8' }
    ];

    const fullVersionList = [
      { brand: 'Android WebView', version: '120.0.6099.291' },
      { brand: 'Chromium', version: '120.0.6099.291' },
      { brand: 'Not_A Brand', version: '8.0.0.0' }
    ];

    const userAgentData = {
      brands: brands,
      mobile: true,
      platform: 'Android',
      getHighEntropyValues: function(hints) {
        return Promise.resolve({
          brands: brands,
          fullVersionList: fullVersionList,
          mobile: true,
          platform: 'Android',
          platformVersion: '13.0.0',
          architecture: '',
          bitness: '',
          model: '${fp.deviceModel}',
          uaFullVersion: '120.0.6099.291',
          wow64: false,
          formFactors: ['Mobile']
        });
      },
      toJSON: function() {
        return {
          brands: brands,
          mobile: true,
          platform: 'Android'
        };
      }
    };

    Object.defineProperty(Navigator.prototype, 'userAgentData', {
      get: () => userAgentData,
      configurable: true
    });
  } catch(e) {}

  // ===== WebRTC Leak Protection =====
  try {
    // Disable WebRTC to prevent IP leaks
    const rtcHandler = {
      construct(target, args) {
        const pc = Reflect.construct(target, args);
        // Override createOffer/createAnswer to prevent IP leak
        const origCreateOffer = pc.createOffer.bind(pc);
        const origCreateAnswer = pc.createAnswer.bind(pc);

        pc.createOffer = function(options) {
          options = options || {};
          options.offerToReceiveAudio = false;
          options.offerToReceiveVideo = false;
          return origCreateOffer(options);
        };

        pc.createAnswer = function(options) {
          options = options || {};
          return origCreateAnswer(options);
        };

        return pc;
      }
    };

    // Completely disable RTCPeerConnection to prevent any WebRTC leaks
    window.RTCPeerConnection = undefined;
    window.webkitRTCPeerConnection = undefined;
    window.mozRTCPeerConnection = undefined;

    // Also disable getUserMedia
    if (navigator.mediaDevices) {
      navigator.mediaDevices.getUserMedia = () => Promise.reject(new Error('Permission denied'));
      navigator.mediaDevices.enumerateDevices = () => Promise.resolve([]);
    }
    navigator.getUserMedia = undefined;
    navigator.webkitGetUserMedia = undefined;
    navigator.mozGetUserMedia = undefined;
  } catch(e) {}

  console.log('%c[Fingerprint] Device: ${fp.deviceModel} (${fp.deviceVendor})', 'color: #4CAF50; font-weight: bold');
})();
`;

  // Execute in main world immediately
  webFrame.executeJavaScript(spoofingCode, true);
}
