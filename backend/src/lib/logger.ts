// Minimal structured logger: one JSON line per event with a timestamp and
// level, so logs are machine-parseable in prod (CloudWatch/Datadog/etc.)
// instead of raw unstructured console.log text.

type Meta = Record<string, unknown>;

function write(level: 'info' | 'warn' | 'error', message: string, meta?: Meta) {
  const line = { timestamp: new Date().toISOString(), level, message, ...meta };
  const out = level === 'error' ? console.error : console.log;
  out(JSON.stringify(line));
}

export const logger = {
  info: (message: string, meta?: Meta) => write('info', message, meta),
  warn: (message: string, meta?: Meta) => write('warn', message, meta),
  error: (message: string, meta?: Meta) => write('error', message, meta),
};
