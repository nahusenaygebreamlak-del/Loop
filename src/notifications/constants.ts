// Notification categories (button sets), actions and channels for the check-ins.

export const TASK = 'loop-notification-actions';
export const CHANNEL = 'checkins';
export const CHANNEL_QUIET = 'checkin-results';

export const A = {
  moveToday: 'move-today',
  allDone: 'all-done',
  review: 'review',
  openToday: 'open-today',
  addTask: 'add-task',
  notToday: 'not-today',
  moveTomorrow: 'move-tomorrow',
  laterTonight: 'later-tonight',
  sortNow: 'sort-now',
  undo: 'undo',
} as const;

export const CATEGORIES = {
  // VCheckInNotification
  leftovers: [
    { identifier: A.moveToday, buttonTitle: 'Move to today', options: { opensAppToForeground: false } },
    { identifier: A.allDone, buttonTitle: 'All done', options: { opensAppToForeground: false } },
    { identifier: A.review, buttonTitle: 'Review', options: { opensAppToForeground: true } },
  ],
  // NMorningPlain
  plain: [{ identifier: A.openToday, buttonTitle: 'Open Today', options: { opensAppToForeground: true } }],
  // NNotifTexts: 08:30 with nothing planned
  empty: [
    { identifier: A.addTask, buttonTitle: 'Add a task', options: { opensAppToForeground: true } },
    { identifier: A.openToday, buttonTitle: 'Open Today', options: { opensAppToForeground: true } },
  ],
  // NAfternoon
  afternoon: [
    { identifier: A.moveTomorrow, buttonTitle: 'Move to tomorrow', options: { opensAppToForeground: false } },
    { identifier: A.openToday, buttonTitle: 'Open Today', options: { opensAppToForeground: true } },
  ],
  // NSortNotif
  sort: [
    // NNotifTexts: Not today / Later tonight (asks again 2 hours later) / Sort now.
    { identifier: A.notToday, buttonTitle: 'Not today', options: { opensAppToForeground: false } },
    { identifier: A.laterTonight, buttonTitle: 'Later tonight', options: { opensAppToForeground: false } },
    { identifier: A.sortNow, buttonTitle: 'Sort now', options: { opensAppToForeground: true } },
  ],
  // NNotifActed
  acted: [
    { identifier: A.undo, buttonTitle: 'Undo', options: { opensAppToForeground: false } },
    { identifier: A.openToday, buttonTitle: 'Open Today', options: { opensAppToForeground: true } },
  ],
} as const;

export type CategoryId = keyof typeof CATEGORIES;
