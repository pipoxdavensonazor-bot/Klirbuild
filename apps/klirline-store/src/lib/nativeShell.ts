/**
 * Native Android shell helpers (Capacitor bridge injected into the WebView).
 * Safe no-ops when opened in a normal browser.
 */
type CapListenerHandle = { remove: () => void };
type CapAppPlugin = {
  addListener: (
    event: "backButton" | "appUrlOpen",
    cb: (info: { canGoBack?: boolean; url?: string }) => void,
  ) => Promise<CapListenerHandle> | CapListenerHandle;
  exitApp?: () => Promise<void> | void;
  getLaunchUrl?: () => Promise<{ url?: string } | undefined>;
};

function getCapApp(): CapAppPlugin | null {
  const cap = (window as Window & {
    Capacitor?: {
      isNativePlatform?: () => boolean;
      getPlatform?: () => string;
      Plugins?: { App?: CapAppPlugin };
    };
  }).Capacitor;
  if (!cap?.isNativePlatform?.()) return null;
  return cap.Plugins?.App ?? null;
}

function navigateFromDeepLink(url: string): void {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "klirline.com" && parsed.hostname !== "www.klirline.com") {
      return;
    }
    const next = `${parsed.pathname}${parsed.search}${parsed.hash}` || "/";
    if (`${window.location.pathname}${window.location.search}${window.location.hash}` !== next) {
      window.location.assign(next);
    }
  } catch {
    /* ignore malformed urls */
  }
}

export function markNativeShell(): void {
  const cap = (window as Window & {
    Capacitor?: {
      isNativePlatform?: () => boolean;
      getPlatform?: () => string;
    };
  }).Capacitor;
  const native = Boolean(cap?.isNativePlatform?.());
  const root = document.documentElement;
  root.classList.toggle("capacitor-native", native);
  root.classList.toggle(
    "capacitor-android",
    native && cap?.getPlatform?.() === "android",
  );
}

/** Hardware / gesture back → history.back(), else exit app. */
export function bindAndroidBackButton(): () => void {
  const CapApp = getCapApp();
  if (!CapApp?.addListener) return () => {};

  let handle: CapListenerHandle | null = null;
  const pending = CapApp.addListener("backButton", () => {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    void CapApp.exitApp?.();
  });

  if (pending && typeof (pending as Promise<unknown>).then === "function") {
    void (pending as Promise<CapListenerHandle>).then((h) => {
      handle = h;
    });
  } else {
    handle = pending as CapListenerHandle;
  }

  return () => {
    handle?.remove?.();
  };
}

/** Open https://klirline.com/... App Links inside the shell. */
export function bindAppUrlOpen(): () => void {
  const CapApp = getCapApp();
  if (!CapApp?.addListener) return () => {};

  void CapApp.getLaunchUrl?.().then((launch) => {
    if (launch?.url) navigateFromDeepLink(launch.url);
  });

  let handle: CapListenerHandle | null = null;
  const pending = CapApp.addListener("appUrlOpen", (info) => {
    if (info?.url) navigateFromDeepLink(info.url);
  });

  if (pending && typeof (pending as Promise<unknown>).then === "function") {
    void (pending as Promise<CapListenerHandle>).then((h) => {
      handle = h;
    });
  } else {
    handle = pending as CapListenerHandle;
  }

  return () => {
    handle?.remove?.();
  };
}
