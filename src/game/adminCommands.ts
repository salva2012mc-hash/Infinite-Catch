import { Language } from './i18n';

export interface AdminLuckResult {
  success: boolean;
  message: string;
  multiplier?: number;
  durationMs?: number;
  durationLabel?: string;
  isReset?: boolean;
}

export function parseDurationToMs(raw: string, lang: Language = 'es'): { ms: number; label: string } | null {
  const clean = raw.trim().toLowerCase();
  if (!clean) return null;

  if (['max', 'infinito', 'infinite', 'perm', 'permanente', 'forever', 'siempre'].includes(clean)) {
    const ms = 999 * 24 * 60 * 60 * 1000;
    return {
      ms,
      label: lang === 'en' ? '999 days (Permanent)' : '999 días (Permanente)',
    };
  }

  const match = clean.match(/^(\d+(?:\.\d+)?)\s*(s|sec|seg|segundo|segundos|m|min|mins|minuto|minutos|h|hr|hrs|hora|horas|d|dia|dias|day|days)?$/);
  if (!match) return null;

  const val = parseFloat(match[1]);
  if (!Number.isFinite(val) || val <= 0) return null;

  const unit = match[2] || 'm';

  if (['s', 'sec', 'seg', 'segundo', 'segundos'].includes(unit)) {
    const ms = Math.round(val * 1000);
    return {
      ms,
      label: lang === 'en' ? `${val} ${val === 1 ? 'second' : 'seconds'}` : `${val} segundos`,
    };
  }
  if (['m', 'min', 'mins', 'minuto', 'minutos'].includes(unit)) {
    const ms = Math.round(val * 60 * 1000);
    return {
      ms,
      label:
        lang === 'en'
          ? `${val} ${val === 1 ? 'minute' : 'minutes'}`
          : `${val} ${val === 1 ? 'minuto' : 'minutos'}`,
    };
  }
  if (['h', 'hr', 'hrs', 'hora', 'horas'].includes(unit)) {
    const ms = Math.round(val * 60 * 60 * 1000);
    return {
      ms,
      label:
        lang === 'en'
          ? `${val} ${val === 1 ? 'hour' : 'hours'}`
          : `${val} ${val === 1 ? 'hora' : 'horas'}`,
    };
  }
  if (['d', 'dia', 'dias', 'day', 'days'].includes(unit)) {
    const ms = Math.round(val * 24 * 60 * 60 * 1000);
    return {
      ms,
      label:
        lang === 'en'
          ? `${val} ${val === 1 ? 'day' : 'days'}`
          : `${val} ${val === 1 ? 'día' : 'días'}`,
    };
  }

  return null;
}

export function parseAdminCommand(commandText: string, lang: Language = 'es'): AdminLuckResult {
  const trimmed = commandText.trim();
  if (!trimmed) {
    return {
      success: false,
      message:
        lang === 'en'
          ? 'Enter a command. Example: /luck 50 1h'
          : 'Introduce un comando. Ejemplo: /suerte 50 1h',
    };
  }

  const withoutSlash = trimmed.startsWith('/') ? trimmed.slice(1).trim() : trimmed;
  const parts = withoutSlash.split(/\s+/);
  const root = parts[0].toLowerCase();

  if (['ayuda', 'help', 'comandos', 'info'].includes(root)) {
    return {
      success: true,
      message:
        lang === 'en'
          ? 'Available commands:\n• /luck <mult> <time> (Ex: /luck 10 30m, /luck 100 1h, /luck 500 max)\n• /luck reset (Remove luck boost)\n• /luck (View current status)'
          : 'Comandos disponibles:\n• /suerte <mult> <tiempo> (Ej: /suerte 10 30m, /suerte 100 1h, /suerte 500 max)\n• /suerte reset (Quitar boost de suerte)\n• /suerte (Ver estado actual)',
    };
  }

  if (['suerte', 'luck', 'setluck', 'boost'].includes(root)) {
    if (parts.length === 1) {
      return {
        success: false,
        message:
          lang === 'en'
            ? 'Usage: /luck <multiplier> <time>\nExamples: /luck 10 30m | /luck 50 1h | /luck 100 max | /luck reset'
            : 'Uso: /suerte <multiplicador> <tiempo>\nEjemplos: /suerte 10 30m | /suerte 50 1h | /suerte 100 max | /suerte reset',
      };
    }

    const sub = parts[1].toLowerCase();
    if (['reset', 'off', '0', 'clear', 'quitar', 'desactivar', 'cancel'].includes(sub)) {
      return {
        success: true,
        isReset: true,
        multiplier: 1,
        durationMs: 0,
        durationLabel: lang === 'en' ? 'disabled' : 'desactivada',
        message:
          lang === 'en'
            ? '✓ Luck boost disabled successfully.'
            : '✓ Boost de suerte desactivado correctamente.',
      };
    }

    const multClean = sub.replace(/^x/i, '').replace(/x$/i, '');
    const multVal = parseFloat(multClean);
    if (!Number.isFinite(multVal) || multVal < 1) {
      return {
        success: false,
        message:
          lang === 'en'
            ? `Invalid multiplier: "${parts[1]}". Must be a number greater than or equal to 1 (e.g., 5, 10, 50, 100).`
            : `Multiplicador inválido: "${parts[1]}". Debe ser un número mayor o igual a 1 (ej: 5, 10, 50, 100).`,
      };
    }

    const rawDuration = parts.slice(2).join('') || '10m';
    const parsedDuration = parseDurationToMs(rawDuration, lang);
    if (!parsedDuration) {
      return {
        success: false,
        message:
          lang === 'en'
            ? `Invalid duration: "${rawDuration}". Use formats like 30m, 1h, 24h, 7d, or max.`
            : `Duración inválida: "${rawDuration}". Usa formatos como 30m, 1h, 24h, 7d o max.`,
      };
    }

    const roundedMult = Math.round(multVal * 10) / 10;
    return {
      success: true,
      multiplier: roundedMult,
      durationMs: parsedDuration.ms,
      durationLabel: parsedDuration.label,
      message:
        lang === 'en'
          ? `✨ Luck x${roundedMult} activated for ${parsedDuration.label}!`
          : `✨ ¡Suerte x${roundedMult} activada durante ${parsedDuration.label}!`,
    };
  }

  return {
    success: false,
    message:
      lang === 'en'
        ? `Unknown command: "${trimmed}". Type /luck <mult> <time> or /help.`
        : `Comando desconocido: "${trimmed}". Escribe /suerte <mult> <tiempo> o /ayuda.`,
  };
}

export function formatLuckTimeRemaining(seconds: number): string {
  if (seconds <= 0) return '0s';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  if (d > 0) {
    return `${d}d ${h}h`;
  }
  if (h > 0) {
    return `${h}h ${m}m`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}
