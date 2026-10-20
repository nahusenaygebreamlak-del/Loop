import { Linking, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Icon, type IconName } from '@/components/Icon';
import { PressScale } from '@/components/PressScale';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useSnackbar } from '@/components/Snackbar';
import { setEventHidden, useCalendar } from '@/calendar/google';
import { relativeDay, timeRange, todayKey } from '@/lib/dates';
import { eventDay, eventEnd, eventStart } from '@/lib/events';
import { useTheme } from '@/theme/ThemeProvider';
import { font } from '@/theme/typography';
import { openQuickAdd } from './state';
import { EmptyPanel } from './TaskPanel';

/** WEventDetail: a Google event in the panel, read-only. */
export function EventPanel({ id, onClose }: { id: string; onClose: () => void }) {
  const { c } = useTheme();
  const snack = useSnackbar();
  const e = useCalendar((s) => s.events.find((x) => x.id === id));
  if (!e) return <EmptyPanel />;
  const day = eventDay(e);
  const when = `${relativeDay(day, todayKey())}${e.allDay ? ', all day' : `, ${timeRange(eventStart(e), eventEnd(e))}`} · ${e.calendarName}`;
  const people = e.attendees.length > 2 ? `${e.attendees.slice(0, 2).join(', ')} and ${e.attendees.length - 2} others` : e.attendees.join(' and ');
  const rows: [IconName, string, boolean][] = [];
  if (e.location) rows.push(['place', e.location, false]);
  if (people) rows.push(['people', people, false]);
  if (e.description) rows.push(['lines', e.description.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(), true]);

  return (
    <View style={{ flex: 1, gap: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ paddingVertical: 4, paddingHorizontal: 10, borderRadius: 9, backgroundColor: c.cal.eventBg }}>
          <AppText style={{ ...font(700), fontSize: 12.5, color: c.cal.eventText }}>Google Calendar · read-only</AppText>
        </View>
        <View style={{ flex: 1 }} />
        <PressScale accessibilityRole="button" accessibilityLabel="Close details" onPress={onClose} style={{ width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="close" size={20} color={c.text} />
        </PressScale>
      </View>
      <View>
        <AppText accessibilityRole="header" style={{ ...font(800), fontSize: 24, lineHeight: 30 }}>
          {e.title}
        </AppText>
        <AppText tone="secondary" style={{ fontSize: 14.5, marginTop: 6 }}>
          {when}
        </AppText>
      </View>
      {rows.length ? (
        <View style={{ backgroundColor: c.ground, borderRadius: 18 }}>
          {rows.map(([icon, text, muted], i) => (
            <View key={icon} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: muted ? 60 : 48, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: i < rows.length - 1 ? 1 : 0, borderBottomColor: c.card }}>
              <Icon name={icon} size={18} color={c.textSecondary} />
              <AppText numberOfLines={muted ? 4 : 2} style={{ flex: 1, ...font(600), fontSize: 14.5, lineHeight: 21, color: muted ? c.textSecondary : c.text }}>
                {text}
              </AppText>
            </View>
          ))}
        </View>
      ) : null}
      <PrimaryButton label="Add a prep task before it" onPress={() => openQuickAdd({ text: `Prep for ${e.title} `, date: day })} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <PressScale
          accessibilityRole="button"
          onPress={() => {
            void setEventHidden(e.id, true);
            onClose();
            snack({ title: 'Hidden from your list', sub: 'Still in Google Calendar', actions: [{ label: 'Undo', onPress: () => void setEventHidden(e.id, false) }] });
          }}
          style={{ flex: 1, minHeight: 52, borderRadius: 16, backgroundColor: c.ground, alignItems: 'center', justifyContent: 'center' }}
        >
          <AppText style={{ ...font(700), fontSize: 14 }}>Hide from my list</AppText>
        </PressScale>
        {e.link ? (
          <PressScale accessibilityRole="link" onPress={() => void Linking.openURL(e.link!)} style={{ flex: 1, minHeight: 52, borderRadius: 16, backgroundColor: c.ground, alignItems: 'center', justifyContent: 'center' }}>
            <AppText style={{ ...font(700), fontSize: 14, color: c.accentText }}>Open in Google ↗</AppText>
          </PressScale>
        ) : null}
      </View>
      <View style={{ flex: 1 }} />
      <AppText tone="secondary" style={{ fontSize: 12.5 }}>
        Loop only reads your calendar. Change events in Google.
      </AppText>
    </View>
  );
}
