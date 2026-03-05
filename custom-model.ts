/**
 * Example: Using a custom LLM / model
 *
 * SMA supports any Anthropic model — swap out the model string
 * to use a different Claude version.
 */

import { SmartMobileAutomation } from '../src/index.js';

async function main() {
  // Use a specific Claude model
  const sma = new SmartMobileAutomation({
    anthropicApiKey: process.env.ANTHROPIC_API_KEY!,
    model: 'claude-opus-4-20250514', // or any other Anthropic model
    verbose: true,
  });

  const result = await sma.run(
    'Open WhatsApp, go to the first chat, and send "Be right back"'
  );

  console.log(result.success ? 'Done!' : `Error: ${result.error}`);
}

main().catch(console.error);
