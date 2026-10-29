# Google Maps build configuration

The customer address map uses `react-native-maps`. Android builds require a
Google Maps Platform API key with **Maps SDK for Android** enabled. Configure
`GOOGLE_MAPS_ANDROID_API_KEY` as a local build environment variable or an EAS
build secret; do not commit the key. Restrict it to the Android package
`com.ggst.greenspice` and the SHA-1 fingerprints for the build certificates.

The key is passed to the native Maps SDK by `app.config.js`. A Google OAuth
client ID is not a Maps SDK key and is not used by this map. iOS uses its
default Apple Maps provider, so it does not need this Android key.