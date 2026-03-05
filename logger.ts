import chalk from 'chalk';

export type LogLevel = 'info' | 'success' | 'warn' | 'error' | 'debug' | 'step';

const icons: Record<LogLevel, string> = {
  info: 'ℹ',
  success: '✓',
  warn: '⚠',
  error: '✗',
  debug: '◉',
  step: '▸',
};

const colors: Record<LogLevel, (s: string) => string> = {
  info: chalk.cyan,
  success: chalk.green,
  warn: chalk.yellow,
  error: chalk.red,
  debug: chalk.gray,
  step: chalk.blue,
};

export class Logger {
  private verbose: boolean;

  constructor(verbose = false) {
    this.verbose = verbose;
  }

  log(level: LogLevel, message: string): void {
    if (level === 'debug' && !this.verbose) return;
    const icon = icons[level];
    const colorFn = colors[level];
    console.log(`${colorFn(icon)}  ${message}`);
  }

  info(msg: string): void { this.log('info', msg); }
  success(msg: string): void { this.log('success', msg); }
  warn(msg: string): void { this.log('warn', msg); }
  error(msg: string): void { this.log('error', msg); }
  debug(msg: string): void { this.log('debug', msg); }
  step(msg: string): void { this.log('step', msg); }

  banner(): void {
    console.log(chalk.bold.cyan('\n  Smart Mobile Automation'));
    console.log(chalk.gray('  AI-powered Android control\n'));
  }

  divider(): void {
    console.log(chalk.gray('  ' + '─'.repeat(50)));
  }
}

export const logger = new Logger();
