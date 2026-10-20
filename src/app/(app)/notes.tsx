import { router } from 'expo-router';
import { View } from 'react-native';
import { AppText } from '@/components/AppText';
import { EmptyState } from '@/components/EmptyState';
import { Icon } from '@/components/Icon';
import { PressScale } from '@/components/PressScale';
import { MainScroll, ScreenHeader } from '@/components/rows';
import { IconButton } from '@/components/ui';
import { goMain } from '@/features/nav';
import { useMenu } from '@/features/useMenu';
import { checklistCount, notePreview, notesList, noteDate } from '@/lib/inboxViews';
import { useToday } from '@/lib/useToday';
import { useStore } from '@/store/store';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, size } from '@/theme/tokens';
import { font } from '@/theme/typography';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDesk } from '@/desktop/layout';
import { NotesDesk } from '@/desktop/views/NotesDesk';

/** NNotes */
export default function Route() {
  const { desk } = useDesk();
  return desk ? <NotesDesk /> : <NotesPhone />;
}

function NotesPhone() {
  const { c } = useTheme();
  const openMenu = useMenu();
  const { today } = useToday();
  const insets = useSafeAreaInsets();
  const notes = notesList(useStore((s) => s.notes));
  const addNote = useStore((s) => s.addNote);

  const newNote = () => router.push({ pathname: '/note/[id]', params: { id: addNote() } });

  return (
    <View style={{ flex: 1 }}>
      <MainScroll fab={<View />}>
        <ScreenHeader
          onMenu={openMenu}
          right={<IconButton icon="search" label="Search notes" style={{ marginRight: -10 }} onPress={() => goMain('/search')} />}
          subtitle={"Things to keep that aren't tasks"}
          title="Notes"
        />
        <View style={{ paddingTop: 20, paddingHorizontal: size.sideMargin, gap: 10 }}>
          {notes.length === 0 ? (
            <EmptyState style={{ marginHorizontal: 0 }} icon="note" title="No notes yet" text="Packing lists, ideas, meeting notes. Things worth keeping that don't need a date.">
              <View style={{ alignSelf: 'stretch', gap: 8, marginTop: 12 }}>
                {['Start one with New note', 'Or pick "Keep as note" while sorting the Inbox'].map((h) => (
                  <View key={h} style={{ backgroundColor: c.ground, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14 }}>
                    <AppText tone="secondary" style={{ ...font(600), fontSize: 14 }}>
                      {h}
                    </AppText>
                  </View>
                ))}
              </View>
            </EmptyState>
          ) : null}
          {notes.map((n) => {
            const preview = notePreview(n);
            const checks = checklistCount(n);
            return (
              <PressScale
                key={n.id}
                kind="row"
                accessibilityRole="button"
                onPress={() => router.push({ pathname: '/note/[id]', params: { id: n.id } })}
                style={{ backgroundColor: c.card, borderRadius: radius.card, paddingVertical: 18, paddingHorizontal: 20 }}
              >
                <AppText style={{ ...font(800), fontSize: 16, lineHeight: 21 }}>{n.title || 'Untitled note'}</AppText>
                {preview ? (
                  <AppText tone="secondary" numberOfLines={2} style={{ fontSize: 14, lineHeight: 21, marginTop: 6 }}>
                    {preview}
                  </AppText>
                ) : null}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}>
                  {n.pinned ? <Icon name="pin" size={14} color={c.textSecondary} /> : null}
                  <AppText tone="secondary" style={{ ...font(600), fontSize: 12.5 }}>
                    {noteDate(n, today)}
                  </AppText>
                  {checks ? (
                    <>
                      <AppText tone="secondary" style={{ ...font(600), fontSize: 12.5 }}>
                        ·
                      </AppText>
                      <AppText tone="secondary" style={{ ...font(600), fontSize: 12.5 }}>
                        {checks}
                      </AppText>
                    </>
                  ) : null}
                  {n.fromInbox ? (
                    <View style={{ paddingVertical: 3, paddingHorizontal: 8, borderRadius: 8, backgroundColor: c.ground }}>
                      <AppText tone="secondary" style={{ ...font(600), fontSize: 12.5 }}>
                        from Inbox
                      </AppText>
                    </View>
                  ) : null}
                </View>
              </PressScale>
            );
          })}
        </View>
      </MainScroll>
      <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 120 + insets.bottom, paddingBottom: insets.bottom, alignItems: 'center', justifyContent: 'center' }}>
        <LinearGradient pointerEvents="none" colors={[c.ground + '00', c.ground, c.ground]} locations={[0, 0.55, 1]} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
        <PressScale
          accessibilityRole="button"
          accessibilityLabel="New note"
          onPress={newNote}
          style={{ height: 64, paddingLeft: 22, paddingRight: 26, borderRadius: radius.fab, backgroundColor: c.accent, flexDirection: 'row', alignItems: 'center', gap: 10 }}
        >
          <Icon name="plus" size={24} strokeWidth={2.4} color={c.onAccent} />
          <AppText variant="button" tone="onAccent">
            New note
          </AppText>
        </PressScale>
      </View>
    </View>
  );
}
