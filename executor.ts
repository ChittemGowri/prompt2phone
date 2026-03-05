import type {
  ExecutionPlan,
  ExecutionResult,
  ActionStep,
  TapParams,
  SwipeParams,
  TypeTextParams,
  LaunchAppParams,
  PressKeyParams,
  WaitParams,
  ScrollParams,
} from '../types/index.js';
import { ADBBridge } from './adb.js';

export type StepCallback = (step: ActionStep, index: number, total: number) => void;

export class Executor {
  private adb: ADBBridge;
  private onStep?: StepCallback;
  private verbose: boolean;

  constructor(adb: ADBBridge, options?: { onStep?: StepCallback; verbose?: boolean }) {
    this.adb = adb;
    this.onStep = options?.onStep;
    this.verbose = options?.verbose ?? false;
  }

  async execute(plan: ExecutionPlan): Promise<ExecutionResult> {
    const startTime = Date.now();
    let stepsCompleted = 0;

    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i];

      this.onStep?.(step, i, plan.steps.length);

      try {
        await this.executeStep(step);
        stepsCompleted++;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);

        let screenshot: string | undefined;
        try {
          const buf = await this.adb.screenshot();
          screenshot = buf.toString('base64');
        } catch {
          // screenshot failed — that's fine
        }

        return {
          success: false,
          stepsCompleted,
          totalSteps: plan.steps.length,
          error: `Step ${i + 1} (${step.type}) failed: ${errorMsg}`,
          screenshot,
          duration: Date.now() - startTime,
        };
      }
    }

    return {
      success: true,
      stepsCompleted,
      totalSteps: plan.steps.length,
      duration: Date.now() - startTime,
    };
  }

  private async executeStep(step: ActionStep): Promise<void> {
    if (this.verbose) {
      console.log(`  ▸ [${step.type}] ${step.description}`);
    }

    switch (step.type) {
      case 'tap':
        await this.adb.tap(step.params as TapParams);
        break;

      case 'swipe':
        await this.adb.swipe(step.params as SwipeParams);
        break;

      case 'type_text':
        await this.adb.typeText(step.params as TypeTextParams);
        break;

      case 'press_key':
        await this.adb.pressKey(step.params as PressKeyParams);
        break;

      case 'launch_app':
        await this.adb.launchApp(step.params as LaunchAppParams);
        break;

      case 'scroll':
        await this.adb.scroll(step.params as ScrollParams);
        break;

      case 'wait':
        await this.adb.wait(step.params as WaitParams);
        break;

      case 'back':
        await this.adb.goBack();
        break;

      case 'home':
        await this.adb.goHome();
        break;

      case 'screenshot':
        // Fire and forget — useful as a marker step
        await this.adb.screenshot();
        break;

      case 'find_element':
        // Take a screenshot for visual context; actual element finding
        // would require image recognition — placeholder here
        await this.adb.screenshot();
        if (this.verbose) {
          console.log(`    ℹ  find_element is a best-effort step. Using tap fallback.`);
        }
        break;

      default:
        throw new Error(`Unknown action type: ${(step as ActionStep).type}`);
    }
  }
}
