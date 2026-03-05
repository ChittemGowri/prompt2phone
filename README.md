# prompt2phone
# Smart Mobile Automation

> Control your Android phone with natural language, powered by Claude AI.

```
sma run "Open Instagram, go to direct messages, and send 'hi' to the first person"
```

---

## What It Does

Smart Mobile Automation (SMA) translates plain English instructions into Android device actions using AI. It acts like an RPA (Robotic Process Automation) tool built specifically for mobile — no scripting required.

You give it a task. The AI figures out the steps. ADB executes them on your device.

---

## System Requirements

- **Node.js** 18 or higher
- **Android device** or emulator with **USB Debugging** enabled
- **ADB** (Android Debug Bridge) installed and in your `PATH`
  - Part of [Android SDK Platform Tools](https://developer.android.com/tools/releases/platform-tools)
- **Anthropic API key** — [get one here](https://console.anthropic.com/)

---

## Installation

```bash
# Clone the repo
git clone https://github.com/your-org/smart-mobile-automation
cd smart-mobile-automation

# Install dependencies
npm install

# Build TypeScript
npm run build

# Install CLI globally (optional)
npm link
```

---

## Setup

1. Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

2. Add your Anthropic API key:

```
ANTHROPIC_API_KEY=sk-ant-...
```

3. Connect your Android device via USB and enable **USB Debugging** (Settings → Developer Options → USB Debugging).

4. Verify ADB sees your device:

```bash
sma devices
```

---

## CLI Usage

### Run an instruction

```bash
sma run "Open Chrome and search for the weather"
sma run "Take a screenshot and save it"
sma run "Open Settings and enable airplane mode"
```

### Options

```
-d, --device <id>   Target a specific device by ID
-v, --verbose       Show detailed step-by-step output
--dry-run           Plan without executing
--model <model>     Override the AI model
```

### See the plan without executing

```bash
sma run "Open YouTube and play the first video" --dry-run
```

### Interactive mode (REPL)

```bash
sma interactive
```

Type instructions one by one. Type `clear` to reset AI context, `screenshot` to capture screen, `exit` to quit.

### List connected devices

```bash
sma devices
```

### Take a screenshot

```bash
sma screenshot output.png
```

---

## JavaScript API

```js
const { SmartMobileAutomation } = require('smart-mobile-automation');

const sma = new SmartMobileAutomation({
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
});

// Run an instruction
await sma.run("Open WhatsApp and send 'hello' to the first contact");

// Get a plan without executing
const plan = await sma.plan("Open Settings and turn on WiFi");
console.log(plan.steps);

// Execute a plan manually
const result = await sma.executePlan(plan);

// Take a screenshot
const buffer = await sma.screenshot();
require('fs').writeFileSync('screen.png', buffer);
```

### TypeScript API

```ts
import { SmartMobileAutomation, SMAConfig } from 'smart-mobile-automation';

const config: SMAConfig = {
  anthropicApiKey: process.env.ANTHROPIC_API_KEY!,
  model: 'claude-sonnet-4-20250514',
  verbose: true,
};

const sma = new SmartMobileAutomation(config);

const result = await sma.run("Open Maps and search for coffee shops", {
  onStep: (step, index, total) => {
    console.log(`[${index + 1}/${total}] ${step.type}: ${step.description}`);
  },
});
```

---

## Configuration

Settings can be defined in `.env`, `.smarc.json`, or passed directly to the constructor.

| Option | ENV Variable | Default | Description |
|---|---|---|---|
| `anthropicApiKey` | `ANTHROPIC_API_KEY` | — | **Required.** Anthropic API key |
| `model` | `SMA_MODEL` | `claude-sonnet-4-20250514` | AI model to use |
| `deviceId` | `SMA_DEVICE_ID` | auto-detect | ADB device ID |
| `adbPath` | `SMA_ADB_PATH` | `adb` | Path to ADB binary |
| `verbose` | — | `false` | Verbose logging |
| `screenshotOnError` | — | `true` | Capture screen on failure |

`.smarc.json` example:
```json
{
  "model": "claude-opus-4-20250514",
  "verbose": true,
  "deviceId": "emulator-5554"
}
```

---

## How It Works

1. **You provide** a natural language instruction
2. **Claude AI** interprets the command and generates a step-by-step execution plan
3. **Each step** is converted into an ADB shell command (tap, swipe, type, launch, etc.)
4. **ADB communicates** with the connected Android device
5. **The device** performs the requested actions automatically

---

## Supported Actions

| Action | Description |
|---|---|
| `launch_app` | Open an app by package name |
| `tap` | Tap screen coordinates |
| `swipe` | Swipe gesture |
| `type_text` | Type text using keyboard |
| `press_key` | Press hardware key (Back, Home, Enter…) |
| `scroll` | Scroll up/down/left/right |
| `wait` | Pause execution |
| `back` | Press Back button |
| `home` | Press Home button |
| `screenshot` | Capture current screen |

---

## Examples

```bash
# Social media
sma run "Open Instagram and like the first 3 posts in my feed"
sma run "Open Twitter and tweet 'Good morning!'"

# Messaging
sma run "Open WhatsApp and send 'On my way!' to Mom"
sma run "Open Messages and read my latest SMS"

# Productivity
sma run "Open Gmail and star all unread emails"
sma run "Set a timer for 10 minutes"
sma run "Open Maps and navigate home"

# Device control  
sma run "Turn on Do Not Disturb mode"
sma run "Connect to WiFi named 'MyNetwork'"
sma run "Lower brightness to minimum"

# App testing
sma run "Open MyApp, log in with test@example.com, and verify the dashboard loads"
```

---

## Limitations

- Android only (iOS not supported)
- Requires ADB setup and USB Debugging
- Screen coordinates are approximate (AI assumes 1080×1920)
- Dynamic UI elements (popups, CAPTCHAs) may interrupt flows
- Requires active Anthropic API access

---

## Project Structure

```
smart-mobile-automation/
├── src/
│   ├── core/
│   │   ├── automation.ts   # Main public API
│   │   ├── adb.ts          # ADB bridge
│   │   ├── ai-planner.ts   # AI instruction planning
│   │   └── executor.ts     # Plan execution engine
│   ├── utils/
│   │   ├── config.ts       # Config loading
│   │   └── logger.ts       # Logging utilities
│   ├── types/
│   │   └── index.ts        # TypeScript types
│   ├── cli.ts              # CLI entry point
│   └── index.ts            # Library exports
├── examples/
│   ├── instagram-dm.ts     # Instagram DM example
│   ├── javascript-usage.js # Plain JS example
│   └── custom-model.ts     # Custom model example
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

---

## License

MIT
