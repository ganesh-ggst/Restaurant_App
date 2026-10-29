const expoConfig = require("./app.json").expo;

const mapsPluginOptions = {};
const androidMapsApiKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY?.trim();
if (androidMapsApiKey) {
  mapsPluginOptions.androidGoogleMapsApiKey = androidMapsApiKey;
}

module.exports = {
  ...expoConfig,
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
