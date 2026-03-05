// Main public API
export { SmartMobileAutomation } from './core/automation.js';
export { ADBBridge, KeyCode } from './core/adb.js';
export { AIPlanner } from './core/ai-planner.js';
export { Executor } from './core/executor.js';
export { loadConfig } from './utils/config.js';
export { Logger } from './utils/logger.js';

// Types
export type {
  SMAConfig,
  DeviceInfo,
  ExecutionPlan,
  ExecutionResult,
  ActionStep,
  ActionType,
} from './types/index.js';
