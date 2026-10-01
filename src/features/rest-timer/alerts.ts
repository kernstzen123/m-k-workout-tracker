import { reportError } from "@/lib/monitoring";

/**
 * Rest-over alerts: chime (Web Audio, no asset), vibration, and — when the app is in the
 * background and permission was granted — a notification via the service worker.
 * iOS suspends background JS, so there the alert fires as soon as the app is foregrounded.
 */

let audio: AudioContext | null = null;

/** Browsers only allow audio after a user gesture; call this from a tap handler. */
export function primeAudio(): void {
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    audio ??= new Ctx();
    if (audio.state === "suspended") void audio.resume();
  } catch (error) {
    reportError(error, { where: "primeAudio" });
  }
}

function chime(): void {
  if (!audio) return;
  const now = audio.currentTime;
  for (const [offset, freq] of [
    [0, 880],
    [0.22, 1175],
  ] as const) {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, now + offset);
    gain.gain.exponentialRampToValueAtTime(0.35, now + offset + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.35);
    osc.connect(gain).connect(audio.destination);
    osc.start(now + offset);
    osc.stop(now + offset + 0.4);
  }
}

const NOTIFY_KEY = "mk-rest-notify";

export function notificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator;
}

export function notificationsEnabled(): boolean {
  if (!notificationsSupported() || Notification.permission !== "granted") return false;
  try {
    return localStorage.getItem(NOTIFY_KEY) !== "off";
  } catch {
    return true;
  }
}

export async function setNotificationsEnabled(enabled: boolean): Promise<boolean> {
  try {
    localStorage.setItem(NOTIFY_KEY, enabled ? "on" : "off");
  } catch {
    // ignore
  }
  if (!enabled || !notificationsSupported()) return false;
  if (Notification.permission === "default") await Notification.requestPermission();
  return Notification.permission === "granted";
}

async function notify(label: string): Promise<void> {
  if (!notificationsEnabled() || document.visibilityState === "visible") return;
  try {
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification("Rest over", {
      body: label ? `Next set: ${label}` : "Time for your next set.",
      tag: "rest-timer",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      silent: false,
    });
  } catch (error) {
    reportError(error, { where: "rest notification" });
  }
}

export function alertRestOver(label: string): void {
  try {
    chime();
  } catch (error) {
    reportError(error, { where: "chime" });
  }
  if ("vibrate" in navigator) navigator.vibrate([250, 120, 250]);
  void notify(label);
}
