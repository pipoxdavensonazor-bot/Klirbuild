import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.klirline.klirbuild",
  appName: "KlirBuild",
  webDir: "www",
  server: {
    url: process.env.KLIRBUILD_NATIVE_URL || "https://klirline.app",
    cleartext: false,
    allowNavigation: [
      "klirline.app",
      "*.klirline.app",
      "*.workers.dev",
      "*.daily.co",
      "meet.jit.si",
      "*.jit.si",
    ],
  },
  ios: {
    contentInset: "automatic",
    backgroundColor: "#004F6E",
    preferredContentMode: "mobile",
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: "#004F6E",
    },
  },
};

export default config;
