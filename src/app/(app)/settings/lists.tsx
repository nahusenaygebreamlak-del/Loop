import { useEffect, useRef, useState } from 'react';
import { Animated, PanResponder, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { EmptyState } from '@/components/EmptyState';
import { Icon } from '@/components/Icon';
import { PressScale } from '@/components/PressScale';
import { useSheets } from '@/components/Sheet';
import { useSnackbar } from '@/components/Snackbar';
import { Card, GroupLabel, IconButton } from '@/components/ui';
import { goBack } from '@/features/nav';
import { ListEditSheet } from '@/features/sheets/ListEditSheet';
import { monthDay, toKey } from '@/lib/dates';
import { liveLists, openCount } from '@/lib/taskViews';
import { useStore } from '@/store/store';
import type { List } from '@/store/types';
import { useTheme } from '@/theme/ThemeProvider';
import { listColors, size } from '@/theme/tokens';
import { font } from '@/theme/typography';

const ROW = 57; // 56 px row + hairline

/** NSettingsLists: drag handles to reorder, pencil to edit, New list, Archived with Restore. */
export default function ListsSettings() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const sheets = useSheets();
  const snack = useSnackbar();
  const lists = useStore((s) => s.lists);
  const tasks = useStore((s) => s.tasks);
  const updateList = useStore((s) => s.updateList);
  const live = liveLists(lists);
  const archived = lists.filter((l) => !l.deletedAt && l.archivedAt);
  const [dragging, setDragging] = useState<string | null>(null);

  const reorder = (from: number, to: number) => {
    if (from === to) return;
    const next = [...live];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    next.forEach((l, i) => l.sortOrder !== i && updateList(l.id, { sortOrder: i }));
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.ground }}>
      <ScrollView scrollEnabled={!dragging} contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 40 + insets.bottom }}>
        <View style={{ paddingTop: 18, paddingLeft: 14, paddingRight: size.sideMargin }}>
          <IconButton icon="back" label="Back to Settings" onPress={goBack} />
          <AppText variant="display" accessibilityRole="header" style={{ marginTop: 8, marginLeft: 10 }}>
            Lists
          </AppText>
          <AppText tone="secondary" style={{ fontSize: 14.5, marginTop: 6, marginLeft: 10 }}>
            Drag to change the order in the side menu.
          </AppText>
        </View>

        <GroupLabel style={{ paddingTop: 22 }}>{`In the menu · ${live.length}`}</GroupLabel>
        <Card style={{ overflow: 'visible' }}>
          {live.map((l, i) => (
            <DragRow
              key={l.id}
              list={l}
              index={i}
              count={live.length}
              open={openCount(tasks, l.id)}
              active={dragging === l.id}
              onStart={() => setDragging(l.id)}
              onEnd={(to) => {
                setDragging(null);
                reorder(i, to);
              }}
              onEdit={() => sheets.open(() => <ListEditSheet listId={l.id} />)}
            />
          ))}
        </Card>
        <PressScale accessibilityRole="button" onPress={() => sheets.open(() => <ListEditSheet />)} style={{ marginTop: 10, marginHorizontal: size.sideMargin, minHeight: 52, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Icon name="plus" size={20} color={c.accentText} />
          <AppText tone="accent" style={{ ...font(700), fontSize: 15 }}>
            New list
          </AppText>
        </PressScale>

        <GroupLabel>{archived.length ? `Archived · ${archived.length}` : 'Archived'}</GroupLabel>
        {archived.length === 0 ? (
          <EmptyState icon="archive" title="No archived lists" text="Archive a list from its ⋯ menu to hide it without losing tasks." />
        ) : (
          <Card>
            {archived.map((l, i) => {
              const kept = tasks.filter((t) => t.listId === l.id && !t.deletedAt).length;
              return (
                <View key={l.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingVertical: 8, paddingLeft: 20, paddingRight: 18, borderBottomWidth: i < archived.length - 1 ? 1 : 0, borderBottomColor: c.ground }}>
                  <View style={{ width: 14, height: 14, borderRadius: 4, backgroundColor: listColors[l.color], opacity: 0.5 }} />
                  <View style={{ flex: 1 }}>
                    <AppText tone="secondary" style={{ ...font(700), fontSize: 15.5 }}>
                      {l.name}
                    </AppText>
                    <AppText tone="secondary" style={{ ...font(500), fontSize: 13, marginTop: 2 }}>
                      {`Archived ${monthDay(toKey(new Date(l.archivedAt!)))} · ${kept} task${kept === 1 ? '' : 's'} kept`}
                    </AppText>
                  </View>
                  <PressScale
                    accessibilityRole="button"
                    accessibilityLabel={`Restore ${l.name}`}
                    onPress={() => {
                      updateList(l.id, { archivedAt: null });
                      snack({ title: `"${l.name}" is back in your lists` });
                    }}
                    style={{ minHeight: 40, paddingHorizontal: 14, borderRadius: 12, backgroundColor: c.ground, justifyContent: 'center' }}
                  >
                    <AppText tone="accent" style={{ ...font(700), fontSize: 14 }}>
                      Restore
                    </AppText>
                  </PressScale>
                </View>
              );
            })}
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

/** One list row; the handle on the left drags it up or down. */
function DragRow({
  list,
  index,
  count,
  open,
  active,
  onStart,
  onEnd,
  onEdit,
}: {
  list: List;
  index: number;
  count: number;
  open: number;
  active: boolean;
  onStart: () => void;
  onEnd: (to: number) => void;
  onEdit: () => void;
}) {
  const { c } = useTheme();
  const [y] = useState(() => new Animated.Value(0));
  // Latest callbacks for the long-lived responder.
  const cb = useRef({ onStart, onEnd, index, count });
  useEffect(() => {
    cb.current = { onStart, onEnd, index, count };
  });
  // The ref is only read inside gesture handlers, never while rendering.
  // eslint-disable-next-line react-hooks/refs
  const [pan] = useState(() => makePan(y, () => cb.current));

  return (
    <Animated.View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        minHeight: 56,
        paddingLeft: 10,
        paddingRight: 8,
        backgroundColor: active ? c.tint : c.card,
        borderRadius: active ? 16 : 0,
        borderTopLeftRadius: active || index === 0 ? 20 : 0,
        borderTopRightRadius: active || index === 0 ? 20 : 0,
        borderBottomLeftRadius: active || index === count - 1 ? 20 : 0,
        borderBottomRightRadius: active || index === count - 1 ? 20 : 0,
        borderBottomWidth: index < count - 1 ? 1 : 0,
        borderBottomColor: c.ground,
        zIndex: active ? 2 : 0,
        userSelect: 'none',
        transform: [{ translateY: y }],
      }}
    >
      <View
        {...pan.panHandlers}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={`Drag to reorder ${list.name}`}
        accessibilityActions={[{ name: 'increment', label: 'Move down' }, { name: 'decrement', label: 'Move up' }]}
        onAccessibilityAction={(e) => onEnd(Math.max(0, Math.min(count - 1, index + (e.nativeEvent.actionName === 'increment' ? 1 : -1))))}
        style={{ width: 40, height: 48, alignItems: 'center', justifyContent: 'center', cursor: 'grab' } as object}
      >
        <Icon name="drag" size={22} color={active ? c.accentText : c.textSecondary} />
      </View>
      <View style={{ width: 14, height: 14, borderRadius: 4, backgroundColor: listColors[list.color] }} />
      <AppText style={{ flex: 1, ...font(700), fontSize: 15.5 }}>{list.name}</AppText>
      <AppText tone="secondary" style={{ fontSize: 14 }}>
        {open}
      </AppText>
      <PressScale accessibilityRole="button" accessibilityLabel={`Edit ${list.name}`} onPress={onEdit} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="edit" size={18} color={c.textSecondary} />
      </PressScale>
    </Animated.View>
  );
}

type DragCallbacks = { onStart: () => void; onEnd: (to: number) => void; index: number; count: number };

/** A responder that follows the finger and reports the row's new index on release. */
function makePan(y: Animated.Value, latest: () => DragCallbacks) {
  const target = (dy: number) => Math.max(0, Math.min(latest().count - 1, latest().index + Math.round(dy / ROW)));
  return PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: () => latest().onStart(),
    onPanResponderMove: (_, g) => y.setValue(g.dy),
    onPanResponderRelease: (_, g) => {
      y.setValue(0);
      latest().onEnd(target(g.dy));
    },
    onPanResponderTerminate: () => {
      y.setValue(0);
      latest().onEnd(latest().index);
    },
  });
}
