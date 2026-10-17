import { Linking, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Icon, type IconName } from '@/components/Icon';
import { PressScale } from '@/components/PressScale';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SheetCard, useCloseSheet, useSheets } from '@/components/Sheet';
import { useSnackbar } from '@/components/Snackbar';
import { setEventHidden, useCalendar } from '@/calendar/google';
import { relativeDay, timeRange, todayKey } from '@/lib/dates';
import { eventDay, eventEnd, eventStart } from '@/lib/events';
import { useTheme } from '@/theme/ThemeProvider';
import { font } from '@/theme/typography';
import { QuickAddSheet } from './QuickAddSheet';

/** NEventDetail: a Google event, read-only. */
export function EventSheet({ eventId }: { eventId: string }) {
  const { c } = useTheme();
  const close = useCloseSheet();
  const sheets = useSheets();
  const snack = useSnackbar();
  const e = useCalendar((s) => s.events.find((x) => x.id === eventId));
  if (!e) return null;
  const day = eventDay(e);
  const when = `${relativeDay(day, todayKey())}${e.allDay ? ', all day' : `, ${timeRange(eventStart(e), eventEnd(e))}`}`;
  const people = e.attendees.length > 2 ? `${e.attendees.slice(0, 2).join(', ')} and ${e.attendees.length - 2} others` : e.attendees.join(' and ');
  const rows: [IconName, string, boolean][] = [];
  if (e.location) rows.push(['place', e.location, false]);
  if (people) rows.push(['people', people, false]);
  if (e.description) rows.push(['lines', e.description.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(), true]);

  return (
    <SheetCard label="Event details" gap={16} style={{ paddingBottom: 28 }}>
      <View>
        <View style={{ alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 9, backgroundColor: c.cal.eventBg }}>
          <AppText style={{ ...font(700), fontSize: 12.5, color: c.cal.eventText }}>Google Calendar · read-only</AppText>
        </View>
        <AppText accessibilityRole="header" style={{ marginTop: 10, ...font(800), fontSize: 24, lineHeight: 30 }}>
          {e.title}
        </AppText>
        <AppText tone="secondary" style={{ fontSize: 15, marginTop: 6 }}>
          {when}
        </AppText>
      </View>
      {rows.length ? (
        <View style={{ backgroundColor: c.ground, borderRadius: 18 }}>
          {rows.map(([icon, text, muted], i) => (
            <View key={icon} style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-start', paddingVertical: 14, paddingHorizontal: 18, borderBottomWidth: i < rows.length - 1 ? 1 : 0, borderBottomColor: c.card }}>
              <View style={{ marginTop: 1 }}>
                <Icon name={icon} size={20} color={c.textSecondary} />
              </View>
              <AppText numberOfLines={muted ? 4 : 2} style={{ flex: 1, fontSize: 15, lineHeight: 22, color: muted ? c.textSecondary : c.text }}>
                {text}
              </AppText>
            </View>
          ))}
        </View>
      ) : null}
      <PrimaryButton
        label="Add a prep task before it"
        icon={<Icon name="plus" size={22} strokeWidth={2.4} color={c.onAccent} />}
        onPress={() => {
          close();
          sheets.open(() => <QuickAddSheet date={day} initialText={`Prep for ${e.title} `} />);
        }}
      />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <PressScale
          accessibilityRole="button"
          onPress={() => {
            close();
            void setEventHidden(e.id, true);
            snack({ title: 'Hidden from your list', sub: 'Still in Google Calendar', actions: [{ label: 'Undo', onPress: () => void setEventHidden(e.id, false) }] });
          }}
          style={{ flex: 1, minHeight: 50, borderRadius: 16, backgroundColor: c.ground, alignItems: 'center', justifyContent: 'center' }}
        >
          <AppText style={{ ...font(700), fontSize: 14.5 }}>Hide from my list</AppText>
        </PressScale>
        {e.link ? (
          <PressScale
            accessibilityRole="link"
            onPress={() => void Linking.openURL(e.link!)}
            style={{ flex: 1, minHeight: 50, borderRadius: 16, backgroundColor: c.ground, alignItems: 'center', justifyContent: 'center' }}
          >
            <AppText style={{ ...font(700), fontSize: 14.5, color: c.accentText }}>Open in Google</AppText>
          </PressScale>
        ) : null}
      </View>
    </SheetCard>
  );
}
