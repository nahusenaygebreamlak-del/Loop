import { useState } from 'react';
import { View } from 'react-native';
import { AppText } from '@/components/AppText';
import { EmptyState } from '@/components/EmptyState';
import { Check } from '@/components/Check';
import { FilterChips, MainScroll, ScreenHeader, ShowMoreRow } from '@/components/rows';
import { Card } from '@/components/ui';
import { useMenu } from '@/features/useMenu';
import { addDays, formatTime, relativeDay, toKey } from '@/lib/dates';
import { completedGroups, liveLists, visibleTasks } from '@/lib/taskViews';
import { useToday } from '@/lib/useToday';
import { useStore } from '@/store/store';
import { useTheme } from '@/theme/ThemeProvider';
import { size } from '@/theme/tokens';
import { font } from '@/theme/typography';
import { useDesk } from '@/desktop/layout';
import { CompletedDesk } from '@/desktop/views/CompletedDesk';

const SHOWN = 3;
const pad = (n: number) => String(n).padStart(2, '0');
const doneTime = (iso: string) => {
  const d = new Date(iso);
  return formatTime(`${pad(d.getHours())}:${pad(d.getMinutes())}`);
};

/** NCompleted: tapping a filled circle brings the task back. */
export default function Route() {
  const { desk } = useDesk();
  return desk ? <CompletedDesk /> : <CompletedPhone />;
}

function CompletedPhone() {
  const { c } = useTheme();
  const openMenu = useMenu();
  const { today } = useToday();
  const allTasks = useStore((s) => s.tasks);
  const lists = useStore((s) => s.lists);
  const toggleDone = useStore((s) => s.toggleDone);
  const [filter, setFilter] = useState<string>('all');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const tasks = visibleTasks(allTasks, lists);
  const groups = completedGroups(tasks, filter, (iso) => toKey(new Date(iso)));
  const weekAgo = addDays(today, -6);
  const thisWeek = tasks.filter((t) => t.doneAt && !t.deletedAt && toKey(new Date(t.doneAt)) >= weekAgo).length;

  return (
    <MainScroll>
      <ScreenHeader onMenu={openMenu} subtitle={`${thisWeek} done this week`} title="Completed" />
      <FilterChips
        label="Filter by list"
        value={filter}
        onChange={setFilter}
        options={[{ value: 'all', label: 'All lists' }, ...liveLists(lists).map((l) => ({ value: l.id, label: l.name }))]}
      />
      {groups.length === 0 ? (
        <View style={{ paddingTop: 22 }}>
          <EmptyState icon="check" title="Nothing done yet" text="Ticked tasks collect here, so you can see what you got through." />
        </View>
      ) : null}
      {groups.map((g) => {
        const open = expanded.has(g.key);
        const shown = open ? g.tasks : g.tasks.slice(0, SHOWN);
        const more = !open && g.tasks.length > SHOWN;
        return (
          <View key={g.key}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 22, paddingBottom: 10, paddingHorizontal: size.sideMargin }}>
              <AppText variant="label" tone="secondary" accessibilityRole="header">
                {relativeDay(g.key, today)}
              </AppText>
              <AppText variant="label" tone="secondary">
                {g.tasks.length}
              </AppText>
            </View>
            <Card>
              {shown.map((t, j) => {
                const list = lists.find((l) => l.id === t.listId)?.name;
                return (
                  <View
                    key={t.id}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 62, paddingVertical: 8, paddingLeft: 20, paddingRight: 12, borderBottomWidth: j === shown.length - 1 && !more ? 0 : 1, borderBottomColor: c.ground }}
                  >
                    <View style={{ flex: 1 }}>
                      <AppText style={{ ...font(600), fontSize: 15.5, lineHeight: 20, color: c.textSecondary, textDecorationLine: 'line-through' }}>{t.title}</AppText>
                      <AppText tone="secondary" style={{ fontSize: 13.5, marginTop: 3 }}>
                        {['Done ' + doneTime(t.doneAt!), list].filter(Boolean).join(' · ')}
                      </AppText>
                    </View>
                    <Check done label={t.title} onToggle={() => toggleDone(t.id)} />
                  </View>
                );
              })}
              {more ? <ShowMoreRow count={g.tasks.length - SHOWN} onPress={() => setExpanded((s) => new Set(s).add(g.key))} /> : null}
            </Card>
          </View>
        );
      })}
      {groups.length ? (
        <AppText tone="secondary" style={{ marginTop: 18, marginHorizontal: size.sideMargin, fontSize: 13.5, lineHeight: 20 }}>
          Tap a filled circle to bring a task back to its list.
        </AppText>
      ) : null}
    </MainScroll>
  );
}
