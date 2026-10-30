const expoConfig = require("./app.json").expo;

const mapsPluginOptions = {};
const androidMapsApiKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY?.trim();
const iosMapsApiKey = process.env.GOOGLE_MAPS_IOS_API_KEY?.trim();
const isEasAndroidBuild =
  process.env.EAS_BUILD === "true" &&
  process.env.EAS_BUILD_PLATFORM === "android";

if (isEasAndroidBuild && !androidMapsApiKey) {
  throw new Error(
    "Set GOOGLE_MAPS_ANDROID_API_KEY in this EAS build environment before building an Android app.",
  );
}

if (androidMapsApiKey) {
  mapsPluginOptions.androidGoogleMapsApiKey = androidMapsApiKey;
}
if (iosMapsApiKey) {
  mapsPluginOptions.iosGoogleMapsApiKey = iosMapsApiKey;
}

module.exports = {
  ...expoConfig,
  extra: {
    ...expoConfig.extra,
    androidMapsApiKeyConfigured: Boolean(androidMapsApiKey),
    iosMapsApiKeyConfigured: Boolean(iosMapsApiKey),
  },
  plugins: [
    ...expoConfig.plugins,
    ["react-native-maps", mapsPluginOptions],
    [
      "expo-location",
      {
        locationWhenInUsePermission:
          "Allow Green Spice to use your current location to add an address.",
      },
    ],
  ],
};
