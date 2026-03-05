import { execSync, exec } from 'child_process';
import { promisify } from 'util';
import type {
  DeviceInfo,
  TapParams,
  SwipeParams,
  TypeTextParams,
  LaunchAppParams,
  PressKeyParams,
  WaitParams,
  ScrollParams,
} from '../types/index.js';

const execAsync = promisify(exec);

// Android key codes
export const KeyCode = {
  BACK: 4,
  HOME: 3,
  RECENT: 187,
  ENTER: 66,
  DELETE: 67,
  VOLUME_UP: 24,
  VOLUME_DOWN: 25,
  POWER: 26,
};

export class ADBBridge {
  private adbPath: string;
  private deviceId?: string;

  constructor(adbPath = 'adb', deviceId?: string) {
    this.adbPath = adbPath;
    this.deviceId = deviceId;
  }

  // ─── Internal helpers ────────────────────────────────────────────────────────

  private buildCmd(cmd: string): string {
    const deviceFlag = this.deviceId ? `-s ${this.deviceId}` : '';
    return `${this.adbPath} ${deviceFlag} ${cmd}`.trim();
  }

  private async run(cmd: string): Promise<string> {
    const full = this.buildCmd(cmd);
    const { stdout, stderr } = await execAsync(full);
    if (stderr && !stderr.includes('WARNING')) {
      throw new Error(`ADB error: ${stderr.trim()}`);
    }
    return stdout.trim();
  }

  private runSync(cmd: string): string {
    return execSync(this.buildCmd(cmd), { encoding: 'utf8' }).trim();
  }

  // ─── Device Management ───────────────────────────────────────────────────────

  async listDevices(): Promise<DeviceInfo[]> {
    const output = await this.run('devices -l');
    const lines = output.split('\n').slice(1).filter(Boolean);
    const devices: DeviceInfo[] = [];

    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 2) continue;

      const id = parts[0];
      const rawStatus = parts[1];
      const status =
        rawStatus === 'device'
          ? 'online'
          : rawStatus === 'unauthorized'
          ? 'unauthorized'
          : 'offline';

      let model = 'Unknown';
      let androidVersion = 'Unknown';

      if (status === 'online') {
        try {
          model = await this.run(`-s ${id} shell getprop ro.product.model`);
          androidVersion = await this.run(`-s ${id} shell getprop ro.build.version.release`);
        } catch {
          // ignore — device may not respond
        }
      }

      devices.push({ id, model, androidVersion, status });
    }

    return devices;
  }

  async getConnectedDevice(): Promise<DeviceInfo | null> {
    const devices = await this.listDevices();
    const online = devices.filter((d) => d.status === 'online');
    if (online.length === 0) return null;
    if (this.deviceId) return online.find((d) => d.id === this.deviceId) ?? null;
    return online[0];
  }

  setDevice(deviceId: string): void {
    this.deviceId = deviceId;
  }

  // ─── Actions ─────────────────────────────────────────────────────────────────

  async tap({ x, y }: TapParams): Promise<void> {
    await this.run(`shell input tap ${x} ${y}`);
  }

  async swipe({ startX, startY, endX, endY, duration = 300 }: SwipeParams): Promise<void> {
    await this.run(`shell input swipe ${startX} ${startY} ${endX} ${endY} ${duration}`);
  }

  async typeText({ text }: TypeTextParams): Promise<void> {
    // Escape special characters for shell
    const escaped = text.replace(/(['"\\$`!#&*()[\]{}<>|;,?~ ])/g, '\\$1');
    await this.run(`shell input text "${escaped}"`);
  }

  async pressKey({ keyCode }: PressKeyParams): Promise<void> {
    await this.run(`shell input keyevent ${keyCode}`);
  }

  async launchApp({ packageName, activityName }: LaunchAppParams): Promise<void> {
    if (activityName) {
      await this.run(`shell am start -n ${packageName}/${activityName}`);
    } else {
      await this.run(
        `shell monkey -p ${packageName} -c android.intent.category.LAUNCHER 1`
      );
    }
  }

  async goHome(): Promise<void> {
    await this.pressKey({ keyCode: KeyCode.HOME });
  }

  async goBack(): Promise<void> {
    await this.pressKey({ keyCode: KeyCode.BACK });
  }

  async wait({ duration }: WaitParams): Promise<void> {
    await new Promise((res) => setTimeout(res, duration));
  }

  async scroll({ direction, amount = 500 }: ScrollParams): Promise<void> {
    // Screen center coords (assumes 1080x1920 — can be made dynamic)
    const cx = 540;
    const cy = 960;
    const swipeMap: Record<string, SwipeParams> = {
      up: { startX: cx, startY: cy + amount / 2, endX: cx, endY: cy - amount / 2 },
      down: { startX: cx, startY: cy - amount / 2, endX: cx, endY: cy + amount / 2 },
      left: { startX: cx + amount / 2, startY: cy, endX: cx - amount / 2, endY: cy },
      right: { startX: cx - amount / 2, startY: cy, endX: cx + amount / 2, endY: cy },
    };
    await this.swipe(swipeMap[direction]);
  }

  async screenshot(): Promise<Buffer> {
    const tmpPath = '/sdcard/sma_screenshot.png';
    await this.run(`shell screencap -p ${tmpPath}`);
    const { stdout } = await execAsync(`${this.adbPath} pull ${tmpPath} /tmp/sma_ss.png`);
    const fs = await import('fs');
    return fs.readFileSync('/tmp/sma_ss.png');
  }

  async getScreenSize(): Promise<{ width: number; height: number }> {
    const output = await this.run('shell wm size');
    const match = output.match(/(\d+)x(\d+)/);
    if (!match) return { width: 1080, height: 1920 };
    return { width: parseInt(match[1]), height: parseInt(match[2]) };
  }

  async getInstalledPackages(): Promise<string[]> {
    const output = await this.run('shell pm list packages');
    return output
      .split('\n')
      .map((line) => line.replace('package:', '').trim())
      .filter(Boolean);
  }

  async isADBAvailable(): Promise<boolean> {
    try {
      this.runSync('version');
      return true;
    } catch {
      return false;
    }
  }
}
