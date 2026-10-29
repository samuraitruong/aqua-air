import { t as tr } from "../../src/i18n";
import React, { useState } from "react";
import { View, FlatList, Pressable } from "react-native";
import { TextInput, Text } from "../../src/ui/text";
import { useRouter } from "expo-router";
import { useApp } from "../../src/state/AppProvider";
import {
  Screen,
  Field,
  Choices,
  TankCard,
  Empty,
  IconButton,
  Icon,
  SelectField,
} from "../../src/ui/components";
import { s, c } from "../../src/ui/theme";
import { filterTanks } from "../../src/domain/selectors";
import { localDate } from "../../src/domain/dates";
export default function Tanks() {
  const { data } = useApp(),
    router = useRouter();
  const [query, setQuery] = useState(""),
    [filter, setFilter] = useState("all"),
    [sort, setSort] = useState("due"),
    [sortOpen, setSortOpen] = useState(false);
  const tanks = filterTanks(data, query, filter, sort, localDate());
  return (
    <Screen
      title={tr("nav.tanks")}
      back={false}
      scroll={false}
      right={
        <View style={[s.row, { gap: 2 }]}>
          <IconButton
            name="sliders"
            label={tr("messages.sortBy")}
            onPress={() => setSortOpen((v) => !v)}
          />
          <IconButton
            filled
            name="plus"
            label={tr("tank.addTitle")}
            onPress={() => router.push("/tank/edit")}
          />
        </View>
      }
    >
      <FlatList
        data={tanks}
        keyExtractor={(t) => t.id}
        contentContainerStyle={[s.content, { gap: 0 }]}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={4}
        windowSize={5}
        ItemSeparatorComponent={() => (
          <View
            style={{
              height: 12,
            }}
          />
        )}
        ListHeaderComponent={
          <View
            style={{
              gap: 12,
              marginBottom: 16,
            }}
          >
            <View
              style={[
                s.input,
                s.row,
                { backgroundColor: c.search, borderWidth: 0 },
              ]}
            >
              <Icon name="search" size={18} color={c.muted} />
              <TextInput
                accessibilityLabel={tr("tank.searchLabel")}
                placeholder={tr("tank.searchPlaceholder")}
                placeholderTextColor={c.placeholder}
                value={query}
                onChangeText={setQuery}
                style={[s.body, s.grow, { padding: 0 }]}
              />
            </View>
            <Choices
              value={filter}
              onChange={setFilter}
              options={[
                ["all", tr("common.all")],
                ["need", tr("messages.needsCare")],
                ["upcoming", tr("status.upcoming")],
              ]}
            />
            {sortOpen && (
              <SelectField
                label={tr("messages.sortBy")}
                value={sort}
                onChange={(v) => {
                  setSort(v);
                  setSortOpen(false);
                }}
                options={[
                  ["due", tr("messages.carePriority")],
                  ["name", tr("messages.nameAZ")],
                ]}
              />
            )}
          </View>
        }
        renderItem={({ item }) => <TankCard tank={item} />}
        ListEmptyComponent={
          <Empty
            title={
              data.tanks.length
                ? tr("messages.noMatchingTanksFound")
                : tr("messages.noTanksYet")
            }
            action={tr("tank.addTitle")}
            onPress={() => router.push("/tank/edit")}
          />
        }
      />
    </Screen>
  );
}
