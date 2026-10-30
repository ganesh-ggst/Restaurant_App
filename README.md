# Google Maps build configuration

The customer address map uses `react-native-maps`. Android builds require a
Google Maps Platform API key with **Maps SDK for Android** enabled. Configure
`GOOGLE_MAPS_ANDROID_API_KEY` in the build environment; do not commit the key.

The key is passed to the native Maps SDK by `app.config.js`. For EAS, create a
**Sensitive** `GOOGLE_MAPS_ANDROID_API_KEY` variable in the environment used by
the build profile: `preview` for APK builds and `production` for production
builds. Restrict the key to the Android package `com.ggst.greenspice` and the
SHA-1 fingerprints for the build certificates. Android EAS builds fail early
if this key is missing. Other Android builds show a fallback instead of
crashing when the key is not configured.

A Google OAuth client ID is not a Maps SDK key and is not used by this map.
iOS uses its default Apple Maps provider, so it does not need this Android key.
