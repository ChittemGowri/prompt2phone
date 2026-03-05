#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { SmartMobileAutomation } from './core/automation.js';
import { loadConfig } from './utils/config.js';
import { Logger } from './utils/logger.js';
import type { ActionStep } from './types/index.js';

const log = new Logger(true);
const program = new Command();

program
  .name('sma')
  .description('Smart Mobile Automation — control Android with natural language')
  .version('1.0.0');

// ─── run command ─────────────────────────────────────────────────────────────

program
  .command('run <instruction>')
  .description('Execute a natural language instruction on the Android device')
  .option('-d, --device <id>', 'Target device ID')
  .option('-v, --verbose', 'Show detailed step output')
  .option('--dry-run', 'Plan only — do not execute')
  .option('--model <model>', 'AI model to use')
  .action(async (instruction: string, options) => {
    log.banner();

    const config = loadConfig({
      deviceId: options.device,
      verbose: options.verbose,
      model: options.model,
    });

    if (!config.anthropicApiKey) {
      log.error('ANTHROPIC_API_KEY not set. Add it to your .env file or environment.');
      process.exit(1);
    }

    const sma = new SmartMobileAutomation(config);

    if (!options.dryRun) {
      const spinner = ora('Checking device connection...').start();
      const ready = await sma.isReady();
      if (!ready) {
        spinner.fail('No Android device connected. Enable USB Debugging and connect your device.');
        process.exit(1);
      }
      const device = await sma.getDevice();
      spinner.succeed(`Connected to ${chalk.cyan(device?.model ?? 'Unknown')} (Android ${device?.androidVersion})`);
    }

    const spinner = ora(`Planning: ${chalk.italic(instruction)}`).start();
    let plan;
    try {
      plan = await sma.plan(instruction);
      spinner.succeed(`Plan ready — ${plan.steps.length} steps`);
    } catch (err) {
      spinner.fail(`Planning failed: ${err instanceof Error ? err.message : err}`);
      process.exit(1);
    }

    log.divider();
    console.log(chalk.bold('  Execution Plan:\n'));
    plan.steps.forEach((s, i) => {
      console.log(`  ${chalk.gray(String(i + 1).padStart(2, '0'))}  ${chalk.blue(s.type.padEnd(14))} ${s.description}`);
    });
    log.divider();

    if (options.dryRun) {
      log.info('Dry run complete. No actions were executed.');
      return;
    }

    console.log('');
    const execSpinner = ora('Executing...').start();

    const result = await sma.executePlan(plan, {
      onStep: (step: ActionStep, index: number, total: number) => {
        execSpinner.text = `[${index + 1}/${total}] ${step.type}: ${step.description}`;
      },
      verbose: options.verbose,
    });

    if (result.success) {
      execSpinner.succeed(
        `Done! Completed ${result.stepsCompleted}/${result.totalSteps} steps in ${(result.duration / 1000).toFixed(1)}s`
      );
    } else {
      execSpinner.fail(`Failed at step ${result.stepsCompleted + 1}: ${result.error}`);
      process.exit(1);
    }
  });

// ─── devices command ──────────────────────────────────────────────────────────

program
  .command('devices')
  .description('List connected Android devices')
  .action(async () => {
    const config = loadConfig();
    const sma = new SmartMobileAutomation(config);
    const spinner = ora('Scanning for devices...').start();

    const adbOk = await sma.bridge.isADBAvailable();
    if (!adbOk) {
      spinner.fail('ADB not found. Install Android SDK Platform Tools and add adb to your PATH.');
      process.exit(1);
    }

    const devices = await sma.listDevices();
    spinner.stop();

    if (devices.length === 0) {
      log.warn('No devices found. Connect an Android device with USB Debugging enabled.');
      return;
    }

    console.log(chalk.bold('\n  Connected Devices:\n'));
    for (const d of devices) {
      const statusColor = d.status === 'online' ? chalk.green : chalk.red;
      console.log(
        `  ${chalk.cyan(d.id.padEnd(20))} ${statusColor(d.status.padEnd(14))} ${d.model} (Android ${d.androidVersion})`
      );
    }
    console.log('');
  });

// ─── screenshot command ───────────────────────────────────────────────────────

program
  .command('screenshot [output]')
  .description('Capture device screenshot (default: screenshot.png)')
  .option('-d, --device <id>', 'Target device ID')
  .action(async (output = 'screenshot.png', options) => {
    const config = loadConfig({ deviceId: options.device });
    const sma = new SmartMobileAutomation(config);
    const spinner = ora('Capturing screenshot...').start();

    try {
      const buf = await sma.screenshot();
      const { writeFileSync } = await import('fs');
      writeFileSync(output, buf);
      spinner.succeed(`Screenshot saved to ${chalk.cyan(output)} (${(buf.length / 1024).toFixed(1)} KB)`);
    } catch (err) {
      spinner.fail(`Failed: ${err instanceof Error ? err.message : err}`);
      process.exit(1);
    }
  });

// ─── interactive (REPL) command ───────────────────────────────────────────────

program
  .command('interactive')
  .alias('i')
  .description('Start an interactive session')
  .option('-d, --device <id>', 'Target device ID')
  .action(async (options) => {
    const { default: inquirer } = await import('inquirer');

    log.banner();
    const config = loadConfig({ deviceId: options.device, verbose: true });

    if (!config.anthropicApiKey) {
      log.error('ANTHROPIC_API_KEY not set.');
      process.exit(1);
    }

    const sma = new SmartMobileAutomation(config);

    log.info('Starting interactive session. Type "exit" to quit.\n');

    while (true) {
      const { instruction } = await inquirer.prompt([
        {
          type: 'input',
          name: 'instruction',
          message: chalk.cyan('→'),
        },
      ]);

      const cmd = (instruction as string).trim();
      if (!cmd || cmd === 'exit' || cmd === 'quit') break;
      if (cmd === 'clear') { sma.clearHistory(); log.info('History cleared.'); continue; }
      if (cmd === 'screenshot') {
        const buf = await sma.screenshot();
        const { writeFileSync } = await import('fs');
        writeFileSync('screenshot.png', buf);
        log.success('Screenshot saved to screenshot.png');
        continue;
      }

      const spinner = ora('Planning...').start();
      try {
        const result = await sma.run(cmd, {
          onStep: (s, i, t) => { spinner.text = `[${i + 1}/${t}] ${s.type}: ${s.description}`; },
        });
        if (result.success) {
          spinner.succeed(`Done in ${(result.duration / 1000).toFixed(1)}s`);
        } else {
          spinner.fail(result.error ?? 'Unknown error');
        }
      } catch (err) {
        spinner.fail(`Error: ${err instanceof Error ? err.message : err}`);
      }
      console.log('');
    }

    log.info('Goodbye!');
  });

program.parse(process.argv);
