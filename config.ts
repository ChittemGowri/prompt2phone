import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import type { SMAConfig } from '../types/index.js';

const CONFIG_FILE = '.smarc.json';

export function loadConfig(overrides: Partial<SMAConfig> = {}): SMAConfig {
  // Load .env if present
  try {
    const dotenvPath = resolve(process.cwd(), '.env');
    if (existsSync(dotenvPath)) {
      const content = readFileSync(dotenvPath, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const [key, ...rest] = trimmed.split('=');
        if (key && !process.env[key]) {
          process.env[key] = rest.join('=').replace(/^["']|["']$/g, '');
        }
      }
    }
  } catch {
    // silently ignore
  }

  // Load .smarc.json if present
  let fileConfig: Partial<SMAConfig> = {};
  const rcPath = resolve(process.cwd(), CONFIG_FILE);
  if (existsSync(rcPath)) {
    try {
      fileConfig = JSON.parse(readFileSync(rcPath, 'utf8'));
    } catch {
      // silently ignore
    }
  }

  const merged: SMAConfig = {
    anthropicApiKey:
      overrides.anthropicApiKey ??
      fileConfig.anthropicApiKey ??
      process.env.ANTHROPIC_API_KEY ??
      '',
    model:
      overrides.model ??
      fileConfig.model ??
      process.env.SMA_MODEL ??
      'claude-sonnet-4-20250514',
    deviceId:
      overrides.deviceId ?? fileConfig.deviceId ?? process.env.SMA_DEVICE_ID,
    adbPath:
      overrides.adbPath ?? fileConfig.adbPath ?? process.env.SMA_ADB_PATH ?? 'adb',
    verbose:
      overrides.verbose ?? fileConfig.verbose ?? false,
    screenshotOnError:
      overrides.screenshotOnError ?? fileConfig.screenshotOnError ?? true,
  };

  return merged;
}
