import { ADBBridge } from './adb.js';
import { AIPlanner } from './ai-planner.js';
import { Executor, type StepCallback } from './executor.js';
import type { SMAConfig, DeviceInfo, ExecutionPlan, ExecutionResult } from '../types/index.js';

export interface RunOptions {
  /** Called before each step executes */
  onStep?: StepCallback;
  /** Print verbose output */
  verbose?: boolean;
  /** Return the plan without executing it */
  dryRun?: boolean;
  /** Extra context to pass to the AI */
  context?: string;
}

/**
 * SmartMobileAutomation — Main entry point.
 *
 * @example
 * ```ts
 * const sma = new SmartMobileAutomation({ anthropicApiKey: process.env.ANTHROPIC_API_KEY! });
 * await sma.run("Open Instagram and like the first post");
 * ```
 */
export class SmartMobileAutomation {
  private adb: ADBBridge;
  private planner: AIPlanner;
  private config: SMAConfig;

  constructor(config: SMAConfig) {
    this.config = config;
    this.adb = new ADBBridge(config.adbPath ?? 'adb', config.deviceId);
    this.planner = new AIPlanner(config);
  }

  // ─── Device Utilities ────────────────────────────────────────────────────────

  async listDevices(): Promise<DeviceInfo[]> {
    return this.adb.listDevices();
  }

  async getDevice(): Promise<DeviceInfo | null> {
    return this.adb.getConnectedDevice();
  }

  async isReady(): Promise<boolean> {
    const adbOk = await this.adb.isADBAvailable();
    if (!adbOk) return false;
    const device = await this.adb.getConnectedDevice();
    return device !== null;
  }

  // ─── Core API ────────────────────────────────────────────────────────────────

  /**
   * Plan and execute a natural language instruction on the Android device.
   */
  async run(instruction: string, options: RunOptions = {}): Promise<ExecutionResult> {
    const plan = await this.plan(instruction, options.context);

    if (options.dryRun) {
      return {
        success: true,
        stepsCompleted: 0,
        totalSteps: plan.steps.length,
        duration: 0,
      };
    }

    const executor = new Executor(this.adb, {
      onStep: options.onStep,
      verbose: options.verbose ?? this.config.verbose,
    });

    return executor.execute(plan);
  }

  /**
   * Generate an execution plan without running it.
   */
  async plan(instruction: string, context?: string): Promise<ExecutionPlan> {
    return this.planner.plan(instruction, context);
  }

  /**
   * Execute a pre-built plan directly.
   */
  async executePlan(plan: ExecutionPlan, options: RunOptions = {}): Promise<ExecutionResult> {
    const executor = new Executor(this.adb, {
      onStep: options.onStep,
      verbose: options.verbose ?? this.config.verbose,
    });
    return executor.execute(plan);
  }

  /**
   * Take a screenshot of the current device screen.
   * Returns a Buffer of the PNG image.
   */
  async screenshot(): Promise<Buffer> {
    return this.adb.screenshot();
  }

  /**
   * Clear AI conversation history (useful between unrelated tasks).
   */
  clearHistory(): void {
    this.planner.clearHistory();
  }

  // ─── ADB Direct Access ───────────────────────────────────────────────────────

  /** Get low-level ADB bridge for custom commands */
  get bridge(): ADBBridge {
    return this.adb;
  }
}
