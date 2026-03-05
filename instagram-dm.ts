/**
 * Example: Open Instagram and send a DM
 * (mirrors the example from the project PDF)
 *
 * Run: ts-node examples/instagram-dm.ts
 */

import { SmartMobileAutomation } from '../src/index.js';

async function main() {
  const sma = new SmartMobileAutomation({
    anthropicApiKey: process.env.ANTHROPIC_API_KEY!,
    verbose: true,
  });

  // Check device
  const device = await sma.getDevice();
  if (!device) {
    console.error('No device connected.');
    process.exit(1);
  }
  console.log(`Connected to: ${device.model} (Android ${device.androidVersion})\n`);

  // Run the instruction from the PDF
  const result = await sma.run(
    "Open Instagram, go to direct messages, and send 'hi' to the first person",
    {
      onStep: (step, index, total) => {
        console.log(`  [${index + 1}/${total}] ${step.type}: ${step.description}`);
      },
    }
  );

  if (result.success) {
    console.log(`\n✓ Completed in ${(result.duration / 1000).toFixed(1)}s`);
  } else {
    console.error(`\n✗ Failed: ${result.error}`);
  }
}

main().catch(console.error);
