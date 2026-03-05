/**
 * Example: Plain JavaScript usage
 *
 * Run: node examples/javascript-usage.js
 * (after building: npm run build)
 */

const { SmartMobileAutomation } = require('../dist/index.js');

async function main() {
  const sma = new SmartMobileAutomation({
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    verbose: true,
  });

  // Example 1: Open Chrome and search for something
  console.log('Example 1: Web search\n');
  await sma.run('Open Chrome and search for "Android automation"');

  // Example 2: Get a plan without executing
  console.log('\nExample 2: Dry run plan\n');
  const plan = await sma.plan('Open Settings and turn on WiFi');
  console.log('Steps planned:');
  plan.steps.forEach((s, i) => {
    console.log(`  ${i + 1}. [${s.type}] ${s.description}`);
  });

  // Example 3: Take a screenshot
  console.log('\nExample 3: Screenshot\n');
  const screenshot = await sma.screenshot();
  const fs = require('fs');
  fs.writeFileSync('current_screen.png', screenshot);
  console.log('Screenshot saved to current_screen.png');
}

main().catch(console.error);
