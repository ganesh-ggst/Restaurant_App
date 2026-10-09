import type {
  StoreDetailOption,
  StoreDetailSection,
} from "../../constants/managerMockData";

type DataRecord = Record<string, unknown>;

const storeDetailDefinitions = [
  { id: "sd_rest", key: "restaurantNames", title: "Restaurant Name", selectionType: "single" },
  { id: "sd_address", key: "addresses", title: "Manage Hotel Address", selectionType: "single" },
  { id: "sd_tax", key: "taxDetails", title: "Tax Details (GST)", selectionType: "single" },
  { id: "sd_wifi", key: "wifiConnections", title: "Wi-Fi Connections", selectionType: "multiple" },
  { id: "sd_charges", key: "restaurantCharges", title: "Restaurant Charges", selectionType: "single" },
  { id: "sd_delivery", key: "deliveryOptions", title: "Delivery Options", selectionType: "multiple" },
] as const;

const storefrontDefinitions = [
  { id: "sf_greetings", key: "greetings", title: "Greetings", selectionType: "multiple" },
  { id: "sf_search", key: "searchPlaceholders", title: "Search Placeholders", selectionType: "multiple" },
  { id: "sf_featured", key: "featuredContents", title: "Featured Content", selectionType: "single" },
  { id: "sf_empty", key: "emptyStates", title: "Empty States", selectionType: "single" },
  { id: "sf_celebrations", key: "celebrationEmojis", title: "Celebration Emojis", selectionType: "multiple" },
] as const;

const record = (value: unknown): DataRecord =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as DataRecord)
    : {};

const text = (value: unknown) => (typeof value === "string" ? value : "");
const numeric = (value: unknown) =>
  typeof value === "number" ? value : Number(value) || 0;

function collection(data: unknown, key: string): DataRecord[] {
  if (Array.isArray(data)) return data.map(record);

  const source = record(data);
  const nested = source[key] ?? source.items ?? source.options ?? source.data;
  if (Array.isArray(nested)) return nested.map(record);
  return Object.keys(source).length > 0 ? [source] : [];
}

function idOf(item: DataRecord, index: number): string {
  return text(item.id) || text(item._id) || `admin-item-${index}`;
}

function activeOf(item: DataRecord): boolean {
  return item.isActive !== false;
}

function formatAddress(item: DataRecord): { value: string; subValue: string } {
  const location = record(item.location);
  const address = [
    item.address,
    item.area,
    item.city,
    item.state,
    item.pincode,
  ]
    .map(text)
    .filter(Boolean)
    .join(", ");
  const latitude = location.lat;
  const longitude = location.lng;
  return {
    value: address,
    subValue:
      latitude !== undefined && longitude !== undefined
        ? `GPS: ${latitude}, ${longitude}`
        : "",
  };
}

function toStoreDetailOption(
  key: (typeof storeDetailDefinitions)[number]["key"],
  item: DataRecord,
  index: number,
): StoreDetailOption {
  let value = "";
  let subValue = "";

  switch (key) {
    case "restaurantNames":
      value = text(item.name);
      break;
    case "addresses":
      ({ value, subValue } = formatAddress(item));
      break;
    case "taxDetails": {
      if (item.gstPercentage !== undefined) {
        value = `${numeric(item.gstPercentage)}%`;
        subValue = `GST: ${numeric(item.gstPercentage)}%`;
      } else {
        const cgst = numeric(item.cgstPercentage);
        const sgst = numeric(item.sgstPercentage);
        value = `${cgst + sgst}%`;
        subValue = `CGST: ${cgst}% + SGST: ${sgst}%`;
      }
      break;
    }
    case "wifiConnections":
      value = text(item.name);
      subValue = text(item.password);
      break;
    case "restaurantCharges": {
      const packaging = numeric(item.packaging);
      const platform = numeric(item.platform);
      const delivery = numeric(item.delivery);
      value = `Packaging: ₹${packaging} | Platform: ₹${platform} | Delivery: ₹${delivery}`;
      subValue = [
        `Packaging Charge: ₹${packaging}, Platform Fee: ₹${platform}, Base Delivery Fee: ₹${delivery}`,
        text(item.description),
      ]
        .filter(Boolean)
        .join(" • ");
      break;
    }
    case "deliveryOptions": {
      const title = text(item.title) || text(item.name);
      const price = numeric(item.price);
      value = `${title} (${price === 0 ? "Free" : `₹${price}`})`;
      subValue = [item.description, item.estimatedTimeRange]
        .map(text)
        .filter(Boolean)
        .join(" • ");
      break;
    }
  }

  return { id: idOf(item, index), value, subValue, isActive: activeOf(item) };
}

export function getStoreDetailDefinition(id: string) {
  return storeDetailDefinitions.find((definition) => definition.id === id);
}

export function mapAdminStoreDetails(
  data: Record<string, unknown>,
): StoreDetailSection[] {
  return storeDetailDefinitions.map((definition) => ({
    id: definition.id,
    title: definition.title,
    selectionType: definition.selectionType,
    isSectionActive: true,
    options: collection(data[definition.key], definition.key).map(
      (item, index) => toStoreDetailOption(definition.key, item, index),
    ),
  }));
}

export function mapAdminStoreDetailSection(
  id: string,
  data: unknown,
): StoreDetailSection | undefined {
  const definition = getStoreDetailDefinition(id);
  if (!definition) return undefined;
  return {
    id: definition.id,
    title: definition.title,
    selectionType: definition.selectionType,
    isSectionActive: true,
    options: collection(data, definition.key).map((item, index) =>
      toStoreDetailOption(definition.key, item, index),
    ),
  };
}

function toStorefrontOption(
  key: (typeof storefrontDefinitions)[number]["key"],
  item: DataRecord,
  index: number,
): StoreDetailOption {
  let value = "";
  let subValue = "";
  switch (key) {
    case "greetings":
    case "searchPlaceholders":
      value = text(item.text);
      break;
    case "featuredContents":
      value = text(item.title);
      subValue = [
        item.subtitle,
        item.imageUrl,
      ]
        .map(text)
        .filter(Boolean)
        .join(" • ");
      break;
    case "emptyStates":
      value = text(item.title);
      subValue = text(item.description);
      break;
    case "celebrationEmojis":
      value = text(item.emoji);
      subValue = text(item.description);
      break;
  }
  return { id: idOf(item, index), value, subValue, isActive: activeOf(item) };
}

export function getStorefrontDefinition(id: string) {
  return storefrontDefinitions.find((definition) => definition.id === id);
}

export function mapAdminStorefrontDisplay(
  data: Record<string, unknown>,
): StoreDetailSection[] {
  return storefrontDefinitions.map((definition) => ({
    id: definition.id,
    title: definition.title,
    selectionType: definition.selectionType,
    isSectionActive: true,
    options: collection(data[definition.key], definition.key).map(
      (item, index) => toStorefrontOption(definition.key, item, index),
    ),
  }));
}

export function mapAdminStorefrontSection(
  id: string,
  data: unknown,
): StoreDetailSection | undefined {
  const definition = getStorefrontDefinition(id);
  if (!definition) return undefined;
  return {
    id: definition.id,
    title: definition.title,
    selectionType: definition.selectionType,
    isSectionActive: true,
    options: collection(data, definition.key).map((item, index) =>
      toStorefrontOption(definition.key, item, index),
    ),
  };
}
