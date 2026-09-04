import { Drumstick, Leaf, Search, Star } from "lucide-react-native";
import { useColorScheme } from "nativewind";
import { useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// --- MOCK MENU DATA ---
const MENU_ITEMS = [
  {
    id: 1,
    name: "Special Chicken Dum Biryani",
    desc: "Aromatic basmati rice cooked with tender chicken and secret spices.",
    price: "₹319",
    rating: "4.8",
    image:
      "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=400&q=80",
    isVeg: false,
    category: "Biryani",
  },
  {
    id: 2,
    name: "Paneer Butter Masala",
    desc: "Soft paneer cubes in a rich, creamy tomato gravy.",
    price: "₹289",
    rating: "4.6",
    image:
      "https://images.unsplash.com/photo-1645177628172-a94c1f96e6db?auto=format&fit=crop&w=400&q=80",
    isVeg: true,
    category: "Curries",
  },
  {
    id: 3,
    name: "Tandoori Platter",
    desc: "Assorted kebabs and tikkas grilled to perfection.",
    price: "₹549",
    rating: "4.9",
    image:
      "https://images.unsplash.com/photo-1544025162-8315ea011505?auto=format&fit=crop&w=400&q=80",
    isVeg: false,
    category: "Grills",
  },
  {
    id: 4,
    name: "Garlic Naan",
    desc: "Soft flatbread topped with minced garlic and butter.",
    price: "₹55",
    rating: "4.7",
    image:
      "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=400&q=80",
    isVeg: true,
    category: "Breads",
  },
  {
    id: 5,
    name: "Gulab Jamun",
    desc: "Soft, melt-in-your-mouth milk solids soaked in sugar syrup.",
    price: "₹99",
    rating: "4.8",
    image:
      "https://images.unsplash.com/photo-1596803822253-625d8122a613?auto=format&fit=crop&w=400&q=80",
    isVeg: true,
    category: "Desserts",
  },
];

const CATEGORIES = [
  "All",
  "Biryani",
  "Curries",
  "Grills",
  "Breads",
  "Desserts",
];

export default function SearchScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [isVegOnly, setIsVegOnly] = useState(false);

  // --- YOUR EXACT GLOBAL.CSS COLORS ---
  const bgColor = isDark ? "hsl(150, 31%, 9%)" : "hsl(138, 47%, 97%)";
  const cardBg = isDark ? "hsl(149, 27%, 12%)" : "hsl(0, 0%, 100%)";
  const textColor = isDark ? "hsl(136, 42%, 92%)" : "hsl(146, 52%, 15%)";
  const mutedText = isDark ? "hsl(140, 17%, 68%)" : "hsl(146, 26%, 40%)";
  const primaryColor = isDark ? "hsl(142, 70%, 54%)" : "hsl(147, 75%, 33%)";
  const borderColor = isDark ? "hsl(149, 16%, 24%)" : "hsl(141, 47%, 83%)";

  const filteredItems = MENU_ITEMS.filter(
    (item) =>
      (activeCategory === "All" || item.category === activeCategory) &&
      (!isVegOnly || item.isVeg) &&
      item.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <View style={{ flex: 1, backgroundColor: bgColor, paddingTop: insets.top }}>
      {/* HEADER & SEARCH (Sticky) */}
      <View
        style={{
          backgroundColor: bgColor,
          paddingHorizontal: 16,
          paddingVertical: 12,
          zIndex: 10,
        }}
      >
        <Text
          style={{
            color: textColor,
            fontSize: 28,
            fontWeight: "900",
            marginBottom: 16,
          }}
        >
          Full Menu
        </Text>

        <View style={{ flexDirection: "row", gap: 12 }}>
          {/* Search Input */}
          <View
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: cardBg,
              borderRadius: 16,
              paddingHorizontal: 16,
              height: 48,
              borderWidth: 1,
              borderColor: borderColor,
            }}
          >
            <Search size={20} color={mutedText} strokeWidth={2.5} />
            <TextInput
              placeholder="Search dishes..."
              placeholderTextColor={mutedText}
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={{
                flex: 1,
                marginLeft: 12,
                color: textColor,
                fontSize: 16,
                fontWeight: "500",
                includeFontPadding: false,
                paddingVertical: 0,
              }}
            />
          </View>

          {/* Veg Toggle */}
          <Pressable
            onPress={() => setIsVegOnly(!isVegOnly)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: isVegOnly ? primaryColor : cardBg,
              borderRadius: 16,
              paddingHorizontal: 16,
              borderWidth: 1,
              borderColor: isVegOnly ? primaryColor : borderColor,
            }}
          >
            <View
              style={{
                width: 12,
                height: 12,
                borderWidth: 1,
                borderColor: isVegOnly ? "#fff" : mutedText,
                justifyContent: "center",
                alignItems: "center",
                borderRadius: 2,
                marginRight: 6,
              }}
            >
              {isVegOnly && (
                <View
                  style={{
                    width: 6,
                    height: 6,
                    backgroundColor: "#fff",
                    borderRadius: 3,
                  }}
                />
              )}
            </View>
            <Text
              style={{
                color: isVegOnly ? "#fff" : mutedText,
                fontSize: 12,
                fontWeight: "900",
                letterSpacing: 0.5,
              }}
            >
              VEG
            </Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[0]}
      >
        {/* CATEGORY FILTERS */}
        <View
          style={{
            backgroundColor: bgColor,
            paddingVertical: 8,
            paddingBottom: 16,
          }}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
          >
            {CATEGORIES.map((cat) => (
              <Pressable
                key={cat}
                onPress={() => setActiveCategory(cat)}
                style={{
                  paddingHorizontal: 20,
                  paddingVertical: 8,
                  borderRadius: 20,
                  backgroundColor:
                    activeCategory === cat ? primaryColor : cardBg,
                  borderWidth: 1,
                  borderColor:
                    activeCategory === cat ? primaryColor : borderColor,
                }}
              >
                <Text
                  style={{
                    color: activeCategory === cat ? "#fff" : textColor,
                    fontSize: 14,
                    fontWeight: "700",
                  }}
                >
                  {cat}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* MENU LIST */}
        <View style={{ paddingHorizontal: 16, gap: 16 }}>
          {filteredItems.map((item) => (
            <View
              key={item.id}
              style={{
                flexDirection: "row",
                backgroundColor: cardBg,
                borderRadius: 24,
                padding: 12,
                borderWidth: 1,
                borderColor: borderColor,
              }}
            >
              {/* Item Info */}
              <View style={{ flex: 1, paddingRight: 12 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 6,
                  }}
                >
                  {item.isVeg ? (
                    <Leaf
                      size={14}
                      color="hsl(146, 80%, 40%)"
                      strokeWidth={3}
                    />
                  ) : (
                    <Drumstick
                      size={14}
                      color="hsl(8, 100%, 65%)"
                      strokeWidth={3}
                    />
                  )}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginLeft: 6,
                    }}
                  >
                    <Star size={12} color={primaryColor} fill={primaryColor} />
                    <Text
                      style={{
                        marginLeft: 4,
                        color: primaryColor,
                        fontSize: 12,
                        fontWeight: "800",
                      }}
                    >
                      {item.rating}
                    </Text>
                  </View>
                </View>

                <Text
                  style={{
                    color: textColor,
                    fontSize: 16,
                    fontWeight: "800",
                    marginBottom: 4,
                  }}
                >
                  {item.name}
                </Text>
                <Text
                  style={{ color: mutedText, fontSize: 12, lineHeight: 18 }}
                  numberOfLines={2}
                >
                  {item.desc}
                </Text>
                <Text
                  style={{
                    color: textColor,
                    fontSize: 18,
                    fontWeight: "900",
                    marginTop: 12,
                  }}
                >
                  {item.price}
                </Text>
              </View>

              {/* Item Image & Add Button */}
              <View style={{ alignItems: "center" }}>
                <Image
                  source={{ uri: item.image }}
                  style={{ width: 110, height: 110, borderRadius: 16 }}
                />
                <Pressable
                  style={{
                    position: "absolute",
                    bottom: -12,
                    backgroundColor: cardBg,
                    borderWidth: 1,
                    borderColor: primaryColor,
                    borderRadius: 12,
                    paddingHorizontal: 20,
                    paddingVertical: 6,
                    shadowColor: primaryColor,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.2,
                    shadowRadius: 8,
                    elevation: 4,
                  }}
                >
                  <Text
                    style={{
                      color: primaryColor,
                      fontSize: 14,
                      fontWeight: "900",
                    }}
                  >
                    ADD
                  </Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
