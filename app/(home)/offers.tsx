import { useLocalSearchParams, useRouter } from "expo-router";
import { Heart, Tag, UserRound, X } from "lucide-react-native";
import { useColorScheme } from "nativewind";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import FoodCard from "../../components/home/FoodCard";

// --- MOCK DATA ---
const ALL_OFFERS = [
  {
    id: 1,
    title: "50% OFF",
    subtitle: "On your first Biryani order",
    code: "BIRYANI50",
    image:
      "https://images.unsplash.com/photo-1633945274405-b6c8069047b0?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: 2,
    title: "FREE DESSERT",
    subtitle: "On orders above ₹499",
    code: "SWEET",
    image:
      "https://images.unsplash.com/photo-1551024506-0baa2740d303?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: 3,
    title: "FLAT ₹150 OFF",
    subtitle: "Weekend Special Festival",
    code: "WEEKEND150",
    image:
      "https://images.unsplash.com/photo-1544025162-8315ea011505?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: 4,
    title: "20% OFF",
    subtitle: "Midnight cravings sorted",
    code: "MIDNIGHT20",
    image:
      "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=800&q=80",
  },
];

const FOOD_ITEMS = [
  {
    id: 1,
    name: "Special Chicken Dum Biryani",
    price: "₹319",
    time: "30 mins",
    rating: "4.8",
    offer: "₹50 OFF",
    image:
      "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=400&q=80",
    isVeg: false,
    category: "Biryani",
  },
  {
    id: 2,
    name: "Tandoori Platter Full",
    price: "₹549",
    time: "40 mins",
    rating: "4.9",
    offer: "BESTSELLER",
    image:
      "https://images.unsplash.com/photo-1544025162-8315ea011505?auto=format&fit=crop&w=400&q=80",
    isVeg: false,
    category: "Grills",
  },
  {
    id: 3,
    name: "Paneer Butter Masala",
    price: "₹289",
    time: "25 mins",
    rating: "4.6",
    offer: "20% OFF",
    image:
      "https://images.unsplash.com/photo-1645177628172-a94c1f96e6db?auto=format&fit=crop&w=400&q=80",
    isVeg: true,
    category: "Curries",
  },
  {
    id: 4,
    name: "Garlic Naan",
    price: "₹55",
    time: "15 mins",
    rating: "4.7",
    offer: "HOT",
    image:
      "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=400&q=80",
    isVeg: true,
    category: "Breads",
  },
  {
    id: 5,
    name: "Gulab Jamun",
    price: "₹99",
    time: "10 mins",
    rating: "4.8",
    offer: "SWEET",
    image:
      "https://images.unsplash.com/photo-1596803822253-625d8122a613?auto=format&fit=crop&w=400&q=80",
    isVeg: true,
    category: "Desserts",
  },
];

export default function OffersScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();

  const params = useLocalSearchParams();
  const targetOfferId = params.offerId
    ? parseInt(params.offerId as string)
    : null;

  const bgColor = isDark ? "hsl(150, 31%, 9%)" : "hsl(138, 47%, 97%)";
  const cardBg = isDark ? "hsl(149, 27%, 12%)" : "hsl(0, 0%, 100%)";
  const textColor = isDark ? "hsl(136, 42%, 92%)" : "hsl(146, 52%, 15%)";
  const mutedText = isDark ? "hsl(140, 17%, 68%)" : "hsl(146, 26%, 40%)";
  const primaryColor = isDark ? "hsl(142, 70%, 54%)" : "hsl(147, 75%, 33%)";
  const borderColor = isDark ? "hsl(149, 16%, 24%)" : "hsl(141, 47%, 83%)";

  const displayedOffers = targetOfferId
    ? ALL_OFFERS.filter((o) => o.id === targetOfferId)
    : ALL_OFFERS;

  return (
    <View style={{ flex: 1, backgroundColor: bgColor, paddingTop: insets.top }}>
      {/* UNIVERSAL HEADER */}
      <View
        style={{
          backgroundColor: bgColor,
          paddingHorizontal: 16,
          paddingVertical: 12,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          zIndex: 10,
        }}
      >
        <Text style={{ color: textColor, fontSize: 28, fontWeight: "900" }}>
          Exclusive Offers
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Pressable
            onPress={() => router.push("/(home)/favorites")}
            style={{
              height: 44,
              width: 44,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 22,
              backgroundColor: cardBg,
              borderWidth: 1,
              borderColor: borderColor,
              marginRight: 12,
            }}
          >
            <Heart size={20} color={textColor} strokeWidth={2.5} />
          </Pressable>

          <Pressable
            onPress={() => router.push("/(home)/profile")}
            style={{
              height: 44,
              width: 44,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 22,
              backgroundColor: cardBg,
              borderWidth: 1,
              borderColor: borderColor,
            }}
          >
            <UserRound size={22} color={textColor} strokeWidth={2} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: 100,
          gap: 16,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* CLEAR FILTER BUTTON */}
        {targetOfferId && (
          <Pressable
            onPress={() => router.setParams({ offerId: undefined })}
            style={{
              alignSelf: "flex-start",
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: cardBg,
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: borderColor,
              marginBottom: 8,
            }}
          >
            <Tag
              size={16}
              color={primaryColor}
              strokeWidth={2}
              style={{ marginRight: 6 }}
            />
            <Text
              style={{ color: primaryColor, fontSize: 14, fontWeight: "800" }}
            >
              View All Offers
            </Text>
            <X size={16} color={mutedText} style={{ marginLeft: 6 }} />
          </Pressable>
        )}

        {/* OFFER CARDS & RELATED FOOD ITEMS */}
        {displayedOffers.map((offer) => (
          <View key={offer.id} style={{ marginBottom: targetOfferId ? 0 : 8 }}>
            <Pressable
              onPress={() => router.setParams({ offerId: offer.id.toString() })}
              style={{
                height: 180,
                width: "100%",
                overflow: "hidden",
                borderRadius: 24,
                borderWidth: 1,
                borderColor: borderColor,
              }}
            >
              <Image
                source={{ uri: offer.image }}
                style={{ position: "absolute", height: "100%", width: "100%" }}
                resizeMode="cover"
              />
              <View
                style={{
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  left: 0,
                  right: 0,
                  backgroundColor: "rgba(0,0,0,0.6)",
                }}
              />

              <View style={{ flex: 1, padding: 20, justifyContent: "center" }}>
                <Text
                  style={{
                    color: "#fff",
                    fontSize: 36,
                    fontWeight: "900",
                    letterSpacing: -1,
                  }}
                >
                  {offer.title}
                </Text>
                <Text
                  style={{
                    color: "rgba(255,255,255,0.8)",
                    fontSize: 16,
                    fontWeight: "700",
                    marginTop: 4,
                  }}
                >
                  {offer.subtitle}
                </Text>

                <View
                  style={{
                    marginTop: 16,
                    alignSelf: "flex-start",
                    backgroundColor: "rgba(255,255,255,0.15)",
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.3)",
                    borderStyle: "dashed",
                  }}
                >
                  <Text
                    style={{
                      color: "#fff",
                      fontSize: 14,
                      fontWeight: "900",
                      letterSpacing: 2,
                    }}
                  >
                    CODE: {offer.code}
                  </Text>
                </View>
              </View>
            </Pressable>

            {/* ONLY DISPLAY FOOD CARDS IF THIS SPECIFIC OFFER IS SELECTED */}
            {targetOfferId === offer.id && (
              <View style={{ marginTop: 24 }}>
                <Text
                  style={{
                    color: textColor,
                    fontSize: 20,
                    fontWeight: "900",
                    marginBottom: 16,
                  }}
                >
                  Applicable Items
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    justifyContent: "space-between",
                  }}
                >
                  {/* Mapping all items for now, you can filter this per offer later! */}
                  {FOOD_ITEMS.map((item) => (
                    <FoodCard key={item.id} item={item} />
                  ))}
                </View>
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
