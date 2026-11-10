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

export const SEASON_SCHEMA = {
  type: 'object',
  properties: {
    type: { type: 'string', enum: ['question', 'proposal'] },
    text: { type: 'string' },
    intro: { type: 'string' },
    tiers: { type: 'array', items: { type: 'object', properties: { listId: { type: 'string' }, tier }, required: ['listId', 'tier'] } },
    newLists: { type: 'array', maxItems: 5, items: { type: 'object', properties: { tempId: { type: 'string' }, name: { type: 'string' }, tier }, required: ['tempId', 'name', 'tier'] } },
    tasks: { type: 'array', maxItems: 15, items: { type: 'object', properties: { listRef: { type: 'string' }, title: { type: 'string' }, date: { type: 'string' } }, required: ['listRef', 'title'] } },
  },
  required: ['type'],
};
