const {
  withAppBuildGradle,
  withGradleProperties,
} = require("expo/config-plugins");
const marker = "// AQUAAIR_RELEASE_SIGNING";
function configureReleaseSigning(source) {
  if (source.includes(marker)) {
    if (
      !/release\s*\{(?:\s|\/\/[^\n]*\n)*signingConfig signingConfigs\.release/.test(
        source,
      )
    )
      throw new Error(
        "Aqua Air release signing configuration changed; inspect generated build.gradle.",
      );
    return source;
  }
  const release =
    /release\s*\{((?:\s|\/\/[^\n]*\n)*)signingConfig signingConfigs\.debug/;
  if (!source.includes("signingConfigs {") || !release.test(source))
    throw new Error(
      "Unrecognized Android release signing template; refusing debug-signed release.",
    );
  const block = `${marker}
        release {
            def releaseStore = System.getenv('AQUAAIR_ANDROID_KEYSTORE')
            def releaseStorePassword = System.getenv('AQUAAIR_ANDROID_KEYSTORE_PASSWORD')
            def releaseAlias = System.getenv('AQUAAIR_ANDROID_KEY_ALIAS')
            def releaseKeyPassword = System.getenv('AQUAAIR_ANDROID_KEY_PASSWORD')
            if (gradle.startParameter.taskNames.any { it.toLowerCase().contains('release') || it.toLowerCase() in ['build', 'assemble', 'bundle'] }) {
                if (!releaseStore || !releaseStorePassword || !releaseAlias || !releaseKeyPassword) {
                    throw new GradleException('Missing Android release signing credentials. See docs/release.md.')
                }
            }
            if (releaseStore) storeFile file(releaseStore)
            storePassword releaseStorePassword ?: ''
            keyAlias releaseAlias ?: ''
            keyPassword releaseKeyPassword ?: ''
        }
`;
  return source
    .replace("signingConfigs {", "signingConfigs {\n        " + block)
    .replace(release, "release {$1signingConfig signingConfigs.release");
}
module.exports = (config) => {
  config = withAppBuildGradle(config, (mod) => {
    if (mod.modResults.language !== "groovy")
      throw new Error("Aqua Air signing expects Groovy build.gradle.");
    mod.modResults.contents = configureReleaseSigning(mod.modResults.contents);
    return mod;
  });
  return withGradleProperties(config, (mod) => {
    for (const [key, value] of Object.entries({
      "android.compileSdkVersion": "36",
      "android.targetSdkVersion": "36",
    })) {
      mod.modResults = mod.modResults.filter(
        (item) => item.type !== "property" || item.key !== key,
      );
      mod.modResults.push({ type: "property", key, value });
    }
    return mod;
  });
};
module.exports.configureReleaseSigning = configureReleaseSigning;
