import Svg, { Circle, Path, Rect } from 'react-native-svg';

// Icons copied from the design sources (24×24, stroke 2, round caps).
const ICONS = {
  menu: [<Path key="a" d="M4 8h16M4 16h10" />],
  search: [<Circle key="a" cx="11" cy="11" r="6.5" />, <Path key="b" d="M20 20l-4-4" />],
  plus: [<Path key="a" d="M12 5v14M5 12h14" />],
  check: [<Path key="a" d="M5 12.5l4.5 4.5L19 7.5" />],
  back: [<Path key="a" d="M15 6l-6 6 6 6" />],
  forward: [<Path key="a" d="M9 6l6 6-6 6" />],
  more: [<Path key="a" d="M5 12h.01M12 12h.01M19 12h.01" strokeWidth={3.2} />],
  close: [<Path key="a" d="M6 6l12 12M18 6L6 18" />],
  sun: [<Circle key="a" cx="12" cy="12" r="4" />, <Path key="b" d="M12 3v2M12 19v2M3 12h2M19 12h2" />],
  arrowRight: [<Path key="a" d="M5 12h14M13 6l6 6-6 6" />],
  nextWeek: [<Path key="a" d="M4 12h10M10 6l6 6-6 6M20 5v14" />],
  calendar: [<Rect key="a" x="4" y="5" width="16" height="15" rx="3" />, <Path key="b" d="M4 10h16M9 3v4M15 3v4" />],
  list: [<Rect key="a" x="4" y="4" width="16" height="16" rx="4" />, <Path key="b" d="M8 12h8" />],
  listPlain: [<Rect key="a" x="4" y="4" width="16" height="16" rx="4" />],
  flag: [<Path key="a" d="M6 21V4h11l-2 4 2 4H6" />],
  copy: [<Rect key="a" x="8" y="8" width="12" height="12" rx="3" />, <Path key="b" d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />],
  trash: [<Path key="a" d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13" />],
  inbox: [<Path key="a" d="M4 13l3-8h10l3 8v6H4z" />],
  inboxTray: [<Path key="a" d="M4 13l3-8h10l3 8v6H4z" />, <Path key="b" d="M4 13h5l1 2h4l1-2h5" />],
  note: [<Path key="a" d="M6 4h9l4 4v12H6z" />, <Path key="b" d="M9 12h7M9 16h5" />],
  clock: [<Circle key="a" cx="12" cy="12" r="8" />, <Path key="b" d="M12 8v4l3 2" />],
  bell: [<Path key="a" d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" />, <Path key="b" d="M10 20a2 2 0 0 0 4 0" />],
  repeat: [<Path key="a" d="M17 3l3 3-3 3M4 11V9a3 3 0 0 1 3-3h13M7 21l-3-3 3-3M20 13v2a3 3 0 0 1-3 3H4" />],
  // Standard cog (the design's sun-like gear read as brightness).
  gear: [
    <Path key="a" d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />,
    <Circle key="b" cx="12" cy="12" r="3" />,
  ],
  next7: [<Rect key="a" x="4" y="5" width="16" height="15" rx="3" />, <Path key="b" d="M9 3v4M15 3v4M8 12h8M8 16h5" />],
  allTasks: [<Rect key="a" x="4" y="4" width="16" height="16" rx="4" />, <Path key="b" d="M8 9h8M8 13h8M8 17h5" />],
  completed: [<Circle key="a" cx="12" cy="12" r="8" />, <Path key="b" d="M8.5 12l2.5 2.5 4.5-5" />],
  edit: [<Path key="a" d="M4 20h4L19 9l-4-4L4 16z" />],
  sort: [<Path key="a" d="M7 4v16M4 17l3 3 3-3M17 20V4M14 7l3-3 3 3" />],
  archive: [<Rect key="a" x="4" y="5" width="16" height="4" rx="1.5" />, <Path key="b" d="M6 9v10h12V9M10 13h4" />],
  pin: [<Path key="a" d="M12 17v4M8 3h8l-1 6 3 3v2H6v-2l3-3z" />],
  checklist: [<Circle key="a" cx="6" cy="7" r="2.5" />, <Circle key="b" cx="6" cy="17" r="2.5" />, <Path key="c" d="M11 7h9M11 17h9" />],
  bullets: [<Path key="a" d="M5 7h.01M5 12h.01M5 17h.01" strokeWidth={3.2} />, <Path key="b" d="M10 7h10M10 12h10M10 17h10" />],
  chevronDown: [<Path key="a" d="M6 9l6 6 6-6" />],
  carried: [<Path key="a" d="M4 12a8 8 0 0 1 13.7-5.6M20 4v4h-4M20 12a8 8 0 0 1-13.7 5.6M4 20v-4h4" />],
  drag: [<Path key="a" d="M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01" strokeWidth={3} />],
  alert: [<Circle key="a" cx="12" cy="12" r="9" />, <Path key="b" d="M12 7v6M12 16.5h.01" />],
  wifiOff: [<Path key="a" d="M3 3l18 18M8.5 16.5a5 5 0 0 1 7 0M5 13a10 10 0 0 1 5-2.7M12 20h.01M19 13a10 10 0 0 0-2.4-1.6M2 9a15 15 0 0 1 4.4-2.7M22 9a15 15 0 0 0-9-3.9" />],
  cloudWait: [<Path key="a" d="M7 18a5 5 0 0 1-.5-10 6 6 0 0 1 11.5 1.5A4 4 0 0 1 17 18z" />, <Path key="b" d="M12 11v4l2 1" />],
  undo: [<Path key="a" d="M9 14l-5-5 5-5" />, <Path key="b" d="M4 9h10a6 6 0 0 1 0 12h-3" />],
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 22, color, strokeWidth = 2 }: { name: IconName; size?: number; color: string; strokeWidth?: number }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {ICONS[name]}
    </Svg>
  );
}
