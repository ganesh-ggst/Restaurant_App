import { useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { MapPin, Pencil, Plus, Star, Trash2 } from "lucide-react-native";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  ProfileError,
  ProfileScreenHeader,
} from "../../../components/profile/ProfileUi";
import { useAppTheme } from "../../../hooks/useAppTheme";
import { api } from "../../../services/api";
import type { CustomerAddress } from "../../../services/api/profile";

function formatAddress(address: CustomerAddress): string {
  return [
    address.line1,
    address.line2,
    address.landmark,
    address.city,
    address.state,
    address.pincode,
  ]
    .filter(Boolean)
    .join(", ");
}

export default function AddressesScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAddresses = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setAddresses(await api.getAddresses());
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load your addresses.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadAddresses();
    }, [loadAddresses]),
  );

  const setDefaultAddress = async (id: string) => {
    setError("");
    try {
      await api.setDefaultAddress(id);
      await loadAddresses();
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Unable to set the default address.",
      );
    }
  };

  const deleteAddress = (address: CustomerAddress) => {
    Alert.alert(
      "Delete Address",
      "Are you sure you want to delete this address?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setError("");
            try {
              await api.deleteAddress(address._id);
              setAddresses((current) =>
                current.filter((item) => item._id !== address._id),
              );
            } catch (deleteError) {
              setError(
                deleteError instanceof Error
                  ? deleteError.message
                  : "Unable to delete this address.",
              );
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: theme.bg }}>
      <StatusBar style={theme.isDark ? "light" : "dark"} />
      <ProfileScreenHeader
        title="Manage Addresses"
        onBack={() => router.back()}
      />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 32 }}>
        <ProfileError message={error} />
        <Pressable
          onPress={() => router.push("/(home)/profile/address-form")}
          className="mb-5 flex-row items-center justify-center rounded-2xl border border-dashed p-4"
          style={{ borderColor: theme.primary }}
        >
          <Plus size={20} color={theme.primary} strokeWidth={2.5} />
          <Text className="ml-2 font-bold" style={{ color: theme.primary }}>
            Add New Address
          </Text>
        </Pressable>

        {loading ? (
          <ActivityIndicator color={theme.primary} />
        ) : addresses.length === 0 && !error ? (
          <View className="items-center py-12">
            <MapPin size={32} color={theme.muted} />
            <Text className="mt-3 font-semibold" style={{ color: theme.muted }}>
              No saved addresses yet.
            </Text>
          </View>
        ) : (
          addresses.map((address) => (
            <View
              key={address._id}
              className="mb-4 rounded-2xl border p-4"
              style={{ backgroundColor: theme.card, borderColor: theme.border }}
            >
              <View className="flex-row items-start">
                <MapPin size={22} color={theme.primary} />
                <View className="ml-3 flex-1">
                  <View className="mb-1 flex-row items-center">
                    <Text className="font-black" style={{ color: theme.text }}>
                      {address.label}
                    </Text>
                    {address.isDefault ? (
                      <View
                        className="ml-2 flex-row items-center rounded-full px-2 py-1"
                        style={{ backgroundColor: theme.secondaryBg }}
                      >
                        <Star
                          size={12}
                          color={theme.primary}
                          fill={theme.primary}
                        />
                        <Text
                          className="ml-1 text-xs font-bold"
                          style={{ color: theme.primary }}
                        >
                          Default
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={{ color: theme.muted }}>
                    {formatAddress(address)}
                  </Text>
                </View>
              </View>
              <View className="mt-4 flex-row justify-end gap-4">
                {!address.isDefault ? (
                  <Pressable
                    onPress={() => void setDefaultAddress(address._id)}
                    className="flex-row items-center gap-1"
                  >
                    <Star size={16} color={theme.primary} />
                    <Text className="font-bold" style={{ color: theme.primary }}>
                      Set default
                    </Text>
                  </Pressable>
                ) : null}
                <Pressable
                  onPress={() =>
                    router.push(
                      `/(home)/profile/address-form?id=${encodeURIComponent(address._id)}`,
                    )
                  }
                  className="flex-row items-center gap-1"
                >
                  <Pencil size={16} color={theme.primary} />
                  <Text className="font-bold" style={{ color: theme.primary }}>
                    Edit
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => deleteAddress(address)}
                  className="flex-row items-center gap-1"
                >
                  <Trash2 size={16} color={theme.danger} />
                  <Text className="font-bold" style={{ color: theme.danger }}>
                    Delete
                  </Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
