// JSON Schemas sent to Gemini (docs/13 §6.4). Gemini enforces maxItems but ignores maxLength,
// so text lengths are trimmed in code (index.ts) and checked again on the device (src/lib/coachPlan.ts).

const tier = { type: 'string', enum: ['core', 'secondary', 'support'] };

export const PLAN_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    suggestions: {
      type: 'array',
      maxItems: 8,
      items: {
        type: 'object',
        properties: {
          taskId: { type: 'string' },
          kind: { type: 'string', enum: ['schedule', 'today', 'later'] },
          start: { type: 'string' },
          end: { type: 'string' },
          date: { type: 'string' },
          reason: { type: 'string' },
        },
        required: ['taskId', 'kind', 'reason'],
      },
    },
  },
  required: ['summary', 'suggestions'],
};

// Gemini leaves out fields that aren't required, so each step has its own schema with every field required
// (a single shared one lost the answers to pick from, 11 Nov 2026).

/** season_turn: the next question with 4 answers, or ready = true when the coach knows enough. */
export const QUESTION_SCHEMA = {
  type: 'object',
  properties: {
    ready: { type: 'boolean' },
    text: { type: 'string' },
    options: { type: 'array', maxItems: 4, items: { type: 'string' } },
  },
  required: ['ready', 'text', 'options'],
};

/** season_proposal: tiers, new lists, goal lines, first tasks, the brief and the intro. */
export const PROPOSAL_SCHEMA = {
  type: 'object',
  properties: {
    intro: { type: 'string' },
    tiers: { type: 'array', items: { type: 'object', properties: { listId: { type: 'string' }, tier }, required: ['listId', 'tier'] } },
    newLists: { type: 'array', maxItems: 5, items: { type: 'object', properties: { tempId: { type: 'string' }, name: { type: 'string' }, tier }, required: ['tempId', 'name', 'tier'] } },
    goals: { type: 'array', maxItems: 12, items: { type: 'object', properties: { listRef: { type: 'string' }, goal: { type: 'string' } }, required: ['listRef', 'goal'] } },
    tasks: { type: 'array', maxItems: 15, items: { type: 'object', properties: { listRef: { type: 'string' }, title: { type: 'string' }, date: { type: 'string' } }, required: ['listRef', 'title'] } },
    brief: { type: 'string' },
  },
  required: ['intro', 'tiers', 'newLists', 'goals', 'tasks', 'brief'],
};
