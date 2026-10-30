# Google Maps build configuration

The customer address and admin store-detail maps use `react-native-maps`.
Android builds require a Google Maps Platform API key with **Maps SDK for
Android** enabled. Configure `GOOGLE_MAPS_ANDROID_API_KEY` in the build
environment; do not commit the key.

The key is passed to the native Maps SDK by `app.config.js`. For EAS, create a
**Sensitive** `GOOGLE_MAPS_ANDROID_API_KEY` variable in the environment used by
the build profile: `preview` for APK builds and `production` for production
builds. Restrict the key to the Android package `com.ggst.greenspice` and the
SHA-1 fingerprints for the build certificates. Android EAS builds fail early
if this key is missing. Expo Go uses its bundled map configuration; other
Android builds show a fallback instead of crashing when the key is not
configured.

A Google OAuth client ID is not a Maps SDK key and is not used by this map.
iOS uses Apple Maps by default. To use Google Maps on iOS as well, configure
`GOOGLE_MAPS_IOS_API_KEY` with **Maps SDK for iOS** enabled and restricted to
the bundle identifier `com.ggst.greenspice`. If this key is absent, iOS keeps
using Apple Maps.

# Running on Android

Run `npm start` to start Metro in Expo Go mode and scan its QR code with Expo
Go. Voice search uses a native speech-recognition module that Expo Go does not
include, so voice search is unavailable when running the app in Expo Go. Use an
Android or iOS build that includes the native speech-recognition module for
voice search. Expo Go also limits Android media-library access, so saving table
QR codes from the manager screen requires an installed app build for full
functionality.
