import { useEffect, useState } from 'react';
import { nowTime, todayKey } from './dates';

/** Today's date key and the current time, refreshed every 30 seconds (so midnight and "now" stay right). */
export function useToday() {
  const [state, setState] = useState(() => ({ today: todayKey(), now: nowTime() }));
  useEffect(() => {
    const id = setInterval(() => {
      const next = { today: todayKey(), now: nowTime() };
      setState((s) => (s.today === next.today && s.now === next.now ? s : next));
    }, 30_000);
    return () => clearInterval(id);
  }, []);
  return state;
}
