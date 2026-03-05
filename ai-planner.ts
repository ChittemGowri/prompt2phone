import Anthropic from '@anthropic-ai/sdk';
import type { ExecutionPlan, ActionStep, SMAConfig } from '../types/index.js';

const SYSTEM_PROMPT = `You are an Android automation assistant. Your job is to convert natural language instructions into precise, step-by-step Android automation actions.

When given an instruction, respond ONLY with a valid JSON object in this exact format:
{
  "explanation": "Brief human-readable explanation of what you'll do",
  "plan": {
    "instruction": "<the original instruction>",
    "estimatedDuration": <total ms estimate>,
    "steps": [
      {
        "type": "<action_type>",
        "description": "<what this step does>",
        "params": { <action-specific params> }
      }
    ]
  }
}

Available action types and their params:
- "launch_app": { "packageName": "com.example.app", "activityName": "optional" }
- "tap": { "x": 540, "y": 960 }
- "swipe": { "startX": 100, "startY": 500, "endX": 100, "endY": 200, "duration": 300 }
- "type_text": { "text": "hello world" }
- "press_key": { "keyCode": 66 } // 66=Enter, 4=Back, 3=Home
- "scroll": { "direction": "up|down|left|right", "amount": 500 }
- "wait": { "duration": 1000 }
- "back": {}
- "home": {}
- "screenshot": {}
- "find_element": { "description": "element to look for", "action": "tap|screenshot" }

Common package names:
- Instagram: com.instagram.android
- WhatsApp: com.whatsapp
- Chrome: com.android.chrome
- Messages: com.google.android.apps.messaging
- Settings: com.android.settings
- Camera: com.android.camera2
- YouTube: com.google.android.youtube
- Gmail: com.google.android.gm
- Maps: com.google.android.apps.maps
- Contacts: com.android.contacts
- Phone/Dialer: com.android.dialer

Screen coordinates assume a 1080x1920 device. Common positions:
- Top-left corner: (100, 100)
- Center: (540, 960)
- Bottom nav area: (540, 1800)
- Status bar: (540, 50)
- Search bar (top): (540, 150)

Always add "wait" steps after launching apps (2000ms) and between significant actions (500-1000ms).
Always include a screenshot step at the end to confirm results.

Respond ONLY with valid JSON. No markdown, no explanation outside the JSON.`;

export class AIPlanner {
  private client: Anthropic;
  private model: string;
  private conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  constructor(config: SMAConfig) {
    this.client = new Anthropic({ apiKey: config.anthropicApiKey });
    this.model = config.model ?? 'claude-sonnet-4-20250514';
  }

  async plan(instruction: string, context?: string): Promise<ExecutionPlan> {
    const userMessage = context
      ? `Context: ${context}\n\nInstruction: ${instruction}`
      : `Instruction: ${instruction}`;

    this.conversationHistory.push({ role: 'user', content: userMessage });

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: this.conversationHistory,
    });

    const rawText = response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('');

    this.conversationHistory.push({ role: 'assistant', content: rawText });

    return this.parseResponse(rawText, instruction);
  }

  private parseResponse(raw: string, originalInstruction: string): ExecutionPlan {
    // Strip markdown code fences if present
    const cleaned = raw.replace(/```json\n?|```\n?/g, '').trim();

    let parsed: { plan: ExecutionPlan; explanation: string };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      throw new Error(`AI returned invalid JSON. Raw response:\n${raw}`);
    }

    if (!parsed.plan || !Array.isArray(parsed.plan.steps)) {
      throw new Error(`AI response missing required "plan.steps" field.`);
    }

    // Validate and normalize steps
    const steps: ActionStep[] = parsed.plan.steps.map((step, i) => {
      if (!step.type) throw new Error(`Step ${i + 1} missing "type" field`);
      return {
        type: step.type,
        description: step.description ?? `Step ${i + 1}`,
        params: step.params ?? {},
      };
    });

    return {
      instruction: originalInstruction,
      steps,
      estimatedDuration: parsed.plan.estimatedDuration ?? steps.length * 1000,
    };
  }

  async refine(feedback: string): Promise<ExecutionPlan> {
    return this.plan(`Refine the previous plan based on this feedback: ${feedback}`);
  }

  clearHistory(): void {
    this.conversationHistory = [];
  }
}
