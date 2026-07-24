import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Thin Android wrapper around the production web app.
 * Camera/mic permissions are required for Daily / Jitsi iframes.
 */
const config: CapacitorConfig = {
  appId: "app.klirline.klirbuild",
  appName: "KlirBuild",
  webDir: "www",
  server: {
    // Load live KlirBuild (Cloudflare). For local QA, point to http://10.0.2.2:3000
    url: process.env.KLIRBUILD_NATIVE_URL || "https://klirline.app",
    cleartext: false,
    allowNavigation: [
      "klirline.app",
      "*.klirline.app",
      "*.workers.dev",
      "*.daily.co",
      "meet.ffmuc.net",
      "meet.jit.si",
      "*.jit.si",
    ],
  },
  android: {
    allowMixedContent: false,
    backgroundColor: "#0A1C31",
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: "#0A1C31",
      immersive: true,
    },
    StatusBar: {
      overlaysWebView: true,
      style: "DARK",
      backgroundColor: "#00000000",
    },
  },
};

export default config;
