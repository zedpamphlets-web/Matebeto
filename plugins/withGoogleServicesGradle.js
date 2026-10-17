const { withAppBuildGradle, withProjectBuildGradle } = require("expo/config-plugins");

/** Same plugin Firebase asked for: com.google.gms.google-services 4.5.0.
 * Expo's Android file uses classpath + apply plugin, not the plugins { id(...) } block.
 * Dropping id(...) apply false into that file makes the build fail. */
const CLASS_PATH = "com.google.gms:google-services:4.5.0";
const APPLY = 'apply plugin: "com.google.gms.google-services"';

function withGoogleServicesGradle(config) {
  config = withProjectBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== "groovy") return cfg;
    let src = cfg.modResults.contents;
    if (/com\.google\.gms:google-services:/.test(src)) {
      src = src.replace(/com\.google\.gms:google-services:[^'"\s]+/, CLASS_PATH);
    } else {
      src = src.replace(/dependencies\s*\{/, `dependencies {\n        classpath '${CLASS_PATH}'`);
    }
    cfg.modResults.contents = src;
    return cfg;
  });

  config = withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== "groovy") return cfg;
    if (cfg.modResults.contents.includes("com.google.gms.google-services")) return cfg;
    cfg.modResults.contents = `${cfg.modResults.contents.trim()}\n\n${APPLY}\n`;
    return cfg;
  });

  return config;
}

module.exports = withGoogleServicesGradle;
