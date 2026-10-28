const { withAppBuildGradle } = require("@expo/config-plugins");

module.exports = function withWindowsCmakeObjectPaths(config) {
  if (process.platform !== "win32") {
    return config;
  }

  return withAppBuildGradle(config, (config) => {
    let contents = config.modResults.contents;
    const objectPathArgument = "-DCMAKE_OBJECT_PATH_MAX=250";

    if (contents.includes("-DCMAKE_OBJECT_PATH_MAX=")) {
      contents = contents.replace(
        /-DCMAKE_OBJECT_PATH_MAX=\d+/g,
        objectPathArgument,
      );
    } else {
      const defaultConfig = /(\bdefaultConfig\s*\{)/;
      if (!defaultConfig.test(contents)) {
        throw new Error("Could not find defaultConfig in android/app/build.gradle");
      }

      contents = contents.replace(
        defaultConfig,
        `$1\n        externalNativeBuild {\n            cmake {\n                arguments "${objectPathArgument}"\n            }\n        }`,
      );
    }

    config.modResults.contents = contents;
    return config;
  });
};
