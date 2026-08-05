/**
 * Turns the native listener's debug log into a one-line answer to "is capture
 * actually working on this phone?".
 *
 * Why parse a log instead of storing state: the service already writes every
 * lifecycle event and capture decision to `<filesDir>/listener-debug.log`, so
 * the heartbeat is already on disk. Adding a second source of truth would just
 * be another thing to keep in sync.
 *
 * Pure — no React, no file I/O, no `Date.now()` in the parsing path — so the
 * node smoke runner can exercise it. Callers pass the file contents in.
 *
 * Log line shape (see NookNotificationListenerService.appendDebugLog):
 *   2026-08-04T09:12:33.123Z CONNECTED allowlist_size=15
 *   2026-08-04T09:12:40.001Z DISCONNECTED requested_rebind=1
 *   2026-08-04T09:13:02.777Z POSTED pkg=com.phonepe.app decision=accepted title=...
 */

/** How long since the last accepted capture still counts as "healthy". */
const HEALTHY_WINDOW_MS = 24 * 60 * 60 * 1000;

export type ListenerStatus =
  /** No log, or a log with no CONNECTED line — the service has never bound. */
  | 'never_connected'
  /** Newest lifecycle event is a disconnect; capture is currently dead. */
  | 'disconnected'
  /** Bound, but nothing captured recently. Normal if you haven't paid anyone. */
  | 'connected_idle'
  /** Bound and captured something within the healthy window. */
  | 'healthy';

export type ListenerHealth = {
  status: ListenerStatus;
  /** ISO timestamp of the newest CONNECTED line, or null. */
  lastConnectedAt: string | null;
  /** ISO timestamp of the newest `decision=accepted` line, or null. */
  lastAcceptedAt: string | null;
  /** ISO timestamp of the newest POSTED line of any decision, or null. */
  lastSeenAnyAt: string | null;
  /** True when the log was rolled, so absence of old events proves nothing. */
  rolled: boolean;
};

const EMPTY: ListenerHealth = {
  status: 'never_connected',
  lastConnectedAt: null,
  lastAcceptedAt: null,
  lastSeenAnyAt: null,
  rolled: false,
};

/** Leading ISO-8601 timestamp written by appendDebugLog. */
const TIMESTAMP_RE = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)\s+(.*)$/;

type ParsedLine = { at: string; rest: string };

function parseLine(line: string): ParsedLine | null {
  const m = TIMESTAMP_RE.exec(line.trim());
  if (!m) return null;
  return { at: m[1], rest: m[2] };
}

/**
 * Summarizes the debug log. `now` is injected so the smoke suite can assert
 * against fixed timestamps instead of wall-clock.
 */
export function summarizeListenerLog(
  log: string,
  now: number = Date.now(),
): ListenerHealth {
  if (!log) return EMPTY;

  // The dev screen may hand us its own placeholder strings ("(empty)",
  // "(file does not exist yet — ...)", "Error reading file: ..."). Treat
  // anything without a parseable timestamped line as "never connected"
  // rather than trying to detect each placeholder.
  const parsed = log
    .split('\n')
    .map(parseLine)
    .filter((l): l is ParsedLine => l !== null);

  if (parsed.length === 0) return { ...EMPTY, rolled: log.includes('[LOG_ROLLED]') };

  let lastConnectedAt: string | null = null;
  let lastDisconnectedAt: string | null = null;
  let lastAcceptedAt: string | null = null;
  let lastSeenAnyAt: string | null = null;

  // Walk newest-first and stop looking for each signal once found. The file is
  // written oldest-first; callers may hand us either order, so we compare
  // timestamps rather than trusting position.
  for (const { at, rest } of parsed) {
    if (rest.startsWith('CONNECTED') && (!lastConnectedAt || at > lastConnectedAt)) {
      lastConnectedAt = at;
    } else if (
      rest.startsWith('DISCONNECTED') &&
      (!lastDisconnectedAt || at > lastDisconnectedAt)
    ) {
      lastDisconnectedAt = at;
    }
    if (rest.startsWith('POSTED')) {
      if (!lastSeenAnyAt || at > lastSeenAnyAt) lastSeenAnyAt = at;
      if (rest.includes('decision=accepted') && (!lastAcceptedAt || at > lastAcceptedAt)) {
        lastAcceptedAt = at;
      }
    }
  }

  const rolled = log.includes('[LOG_ROLLED]');
  const base = { lastConnectedAt, lastAcceptedAt, lastSeenAnyAt, rolled };

  if (!lastConnectedAt) {
    // POSTED lines without a CONNECTED line mean the log rolled away the
    // connect event — the listener is demonstrably alive, so don't claim it
    // has never connected.
    if (lastSeenAnyAt) return { ...base, status: 'connected_idle' };
    return { ...base, status: 'never_connected' };
  }

  if (lastDisconnectedAt && lastDisconnectedAt > lastConnectedAt) {
    return { ...base, status: 'disconnected' };
  }

  if (lastAcceptedAt && now - Date.parse(lastAcceptedAt) <= HEALTHY_WINDOW_MS) {
    return { ...base, status: 'healthy' };
  }

  return { ...base, status: 'connected_idle' };
}

/** `POSTED pkg=<package> ... reason=not_allowlisted` */
const DROPPED_PKG_RE = /^POSTED\s+pkg=(\S+)\s+.*reason=not_allowlisted/;

/**
 * Distinct packages the listener saw and dropped for not being allowlisted,
 * newest first. This is the discovery list behind the tap-to-add picker: the
 * user never has to know package-name strings, they just pick from what their
 * phone actually posted.
 *
 * Works because the native service logs `not_allowlisted` only on the first
 * sighting of each package per connection, so the log is already a deduplicated
 * inventory rather than a firehose.
 *
 * Two caveats for callers:
 *  - The throttle is never reset when the allowlist changes, so a package the
 *    user just added still appears here. Filter the result against the current
 *    allowlist before showing it.
 *  - Pass the raw log contents. The diagnostics screen reverses lines for
 *    display; ordering here comes from the timestamps, not line position.
 */
export function extractSeenPackages(log: string): string[] {
  if (!log) return [];

  const newestByPackage = new Map<string, string>();
  for (const line of log.split('\n')) {
    const parsed = parseLine(line);
    if (!parsed) continue;
    const m = DROPPED_PKG_RE.exec(parsed.rest);
    if (!m) continue;
    const pkg = m[1];
    const seen = newestByPackage.get(pkg);
    if (!seen || parsed.at > seen) newestByPackage.set(pkg, parsed.at);
  }

  return Array.from(newestByPackage.entries())
    .sort((a, b) => (a[1] < b[1] ? 1 : a[1] > b[1] ? -1 : 0))
    .map(([pkg]) => pkg);
}

/** One-line human summary for the diagnostics screen and Settings. */
export function describeListenerHealth(health: ListenerHealth): string {
  switch (health.status) {
    case 'never_connected':
      return 'Listener has never connected on this device.';
    case 'disconnected':
      return 'Listener was disconnected by the system — tap Repair.';
    case 'healthy':
      return `Listener connected · last captured ${health.lastAcceptedAt ?? 'recently'}.`;
    case 'connected_idle':
      return health.lastAcceptedAt
        ? `Listener connected · nothing captured since ${health.lastAcceptedAt}.`
        : 'Listener connected · nothing captured yet.';
  }
}
