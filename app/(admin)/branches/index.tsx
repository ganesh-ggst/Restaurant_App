import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Card } from "../../../components/ui/Card";
import { useAppTheme } from "../../../hooks/useAppTheme";
import {
  adminProfileApi,
  type AdminBranch,
} from "../../../services/api/admin-profile";

export default function ManageBranchesScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const [branches, setBranches] = useState<AdminBranch[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [deletingBranchId, setDeletingBranchId] = useState<string | null>(null);

  const loadBranches = useCallback(async (forceRefresh = false) => {
    setError("");
    try {
      const result = await adminProfileApi.getBranches(forceRefresh);
      setBranches(result.branches);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load branches.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadBranches();
    }, [loadBranches]),
  );

  const refreshBranches = () => {
    setRefreshing(true);
    void loadBranches(true);
  };

  const deleteBranch = async (branch: AdminBranch) => {
    setDeletingBranchId(branch.id);
    try {
      await adminProfileApi.deleteBranch(branch.id);
      await loadBranches(true);
    } catch (deleteError) {
      Alert.alert(
        "Unable to delete branch",
        deleteError instanceof Error
          ? deleteError.message
          : "Please try again.",
      );
    } finally {
      setDeletingBranchId(null);
    }
  };

  const confirmDelete = (branch: AdminBranch) => {
    if (!branch.canDelete) {
      Alert.alert(
        "Branch cannot be deleted",
        "The server currently does not allow this branch to be deleted.",
      );
      return;
    }
    Alert.alert(
      "Delete branch?",
      `Are you sure you want to delete ${branch.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => void deleteBranch(branch),
        },
      ],
    );
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: theme.bg }}>
      <StatusBar style={theme.isDark ? "light" : "dark"} />
      <View className="flex-row items-center justify-between px-6 pb-4 pt-3">
        <View className="flex-1">
          <Text className="text-2xl font-black" style={{ color: theme.text }}>
            Manage branches
          </Text>
          <Text className="mt-1 text-sm" style={{ color: theme.muted }}>
            {branches.length} {branches.length === 1 ? "branch" : "branches"}
          </Text>
        </View>
        <Pressable
          onPress={() => router.push("/(admin)/branches/add" as any)}
          accessibilityRole="button"
          accessibilityLabel="Add new branch"
          className="ml-3 flex-row items-center rounded-2xl px-4 py-3"
          style={{ backgroundColor: theme.primary }}
        >
          <Feather name="plus" size={18} color={theme.primaryForeground} />
          <Text
            className="ml-1.5 font-bold"
            style={{ color: theme.primaryForeground }}
          >
            Add new
          </Text>
        </Pressable>
      </View>

      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{ paddingBottom: 36 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshBranches}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
      >
        {error ? (
          <View
            className="mb-4 rounded-2xl border p-4"
            style={{ backgroundColor: theme.dangerBg, borderColor: theme.border }}
          >
            <Text className="mb-3" style={{ color: theme.danger }}>
              {error}
            </Text>
            <Pressable
              onPress={() => void loadBranches(true)}
              accessibilityRole="button"
            >
              <Text className="font-bold" style={{ color: theme.primary }}>
                Retry
              </Text>
            </Pressable>
          </View>
        ) : null}

        {loading ? (
          <View className="items-center py-12">
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        ) : branches.length === 0 && !error ? (
          <Card className="items-center px-6 py-10">
            <View
              className="mb-4 h-14 w-14 items-center justify-center rounded-full"
              style={{ backgroundColor: theme.secondaryBg }}
            >
              <Feather name="git-branch" size={24} color={theme.primary} />
            </View>
            <Text
              className="mb-2 text-center text-lg font-bold"
              style={{ color: theme.text }}
            >
              No branches yet
            </Text>
            <Text className="text-center text-sm" style={{ color: theme.muted }}>
              Add a branch to see it listed here.
            </Text>
          </Card>
        ) : (
          <View className="gap-3">
            {branches.map((branch) => (
              <Card key={branch.id} className="p-4">
                <View className="flex-row items-start">
                  <View className="flex-1 pr-3">
                    <Text
                      className="text-base font-bold"
                      style={{ color: theme.text }}
                    >
                      {branch.name}
                    </Text>
                    <Text
                      className="mt-1 text-xs font-semibold"
                      style={{ color: theme.muted }}
                    >
                      {branch.code}
                      {branch.isActive ? " · Active" : " · Inactive"}
                    </Text>
                    {branch.admins?.map((admin) => (
                      <Text
                        key={admin.id}
                        className="mt-2 text-sm"
                        style={{ color: theme.muted }}
                      >
                        {admin.name} · {admin.phone}
                      </Text>
                    ))}
                    <Text
                      className="mt-2 text-xs leading-5"
                      style={{ color: theme.muted }}
                    >
                      {branch.area}
                    </Text>
                    {branch.location ? (
                      <Text
                        className="mt-2 text-xs"
                        style={{ color: theme.muted }}
                      >
                        {branch.location.lat.toFixed(6)},{" "}
                        {branch.location.lng.toFixed(6)}
                      </Text>
                    ) : null}
                    <Text
                      className="mt-2 text-xs"
                      style={{ color: theme.muted }}
                    >
                      {branch.adminCount ?? branch.admins?.length ?? 0} admins
                      {" · "}
                      {branch.managerCount ?? 0} managers
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => confirmDelete(branch)}
                    disabled={deletingBranchId === branch.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Delete ${branch.name}`}
                    accessibilityHint={
                      branch.canDelete
                        ? "Deletes this branch after confirmation"
                        : "The server currently does not allow this branch to be deleted"
                    }
                    hitSlop={10}
                    className="rounded-xl p-2.5"
                    style={{
                      backgroundColor: theme.dangerBg,
                      opacity: branch.canDelete ? 1 : 0.55,
                    }}
                  >
                    {deletingBranchId === branch.id ? (
                      <ActivityIndicator color={theme.danger} />
                    ) : (
                      <Feather
                        name="trash-2"
                        size={18}
                        color={theme.danger}
                      />
                    )}
                  </Pressable>
                </View>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
