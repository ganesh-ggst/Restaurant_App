import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Card } from "../../../../../components/ui/Card";
import {
    MANAGER_MOCK_DATA,
    StoreDetailSection,
} from "../../../../../constants/managerMockData";
import { useAppTheme } from "../../../../../hooks/useAppTheme";

export default function StoreDetailsIndexScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();

  const [storeDetails, setStoreDetails] = useState<StoreDetailSection[]>(
    MANAGER_MOCK_DATA.storeDetails,
  );

  useFocusEffect(
    useCallback(() => {
      setStoreDetails([...MANAGER_MOCK_DATA.storeDetails]);
    }, []),
  );

  return (
    <View
      style={{ flex: 1, backgroundColor: theme.bg, paddingTop: insets.top }}
    >
      {/* Header */}
      <View
        className="flex-row items-center px-4 py-4 border-b shadow-sm"
        style={{ backgroundColor: theme.card, borderBottomColor: theme.border }}
      >
        <Pressable
          onPress={() => router.back()}
          className="mr-4 p-1"
          hitSlop={15}
        >
          <Feather name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <Text className="text-xl font-black" style={{ color: theme.text }}>
          Store Details
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        {storeDetails.map((section) => {
          const activeOptions = section.options.filter((o) => o.isActive);
          let displayValue = "None Active";
          if (activeOptions.length > 0) {
            displayValue =
              section.selectionType === "single"
                ? activeOptions[0].value
                : `${activeOptions.length} Active`;
          }

          return (
            <Pressable
              key={section.id}
              onPress={() =>
                router.push(
                  `/(manager)/operations/profile/store-details/${section.id}` as any,
                )
              }
            >
              <Card
                variant="default"
                className="p-4 mb-3 rounded-2xl border-0 flex-row justify-between items-center"
              >
                <View className="flex-1 mr-3">
                  <Text
                    className="text-base font-bold mb-0.5"
                    style={{ color: theme.text }}
                  >
                    {section.title}
                  </Text>
                  <Text
                    className="text-xs font-medium"
                    style={{ color: theme.primary }}
                    numberOfLines={1}
                  >
                    {displayValue}
                  </Text>
                </View>
                <Feather name="chevron-right" size={20} color={theme.muted} />
              </Card>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
