const {
  withAppBuildGradle,
  withGradleProperties,
} = require('@expo/config-plugins');

function withR8Optimization(config) {
  config = withGradleProperties(config, (config) => {
    const properties = config.modResults;

    for (const key of [
      'android.enableMinifyInReleaseBuilds',
      'android.enableShrinkResourcesInReleaseBuilds',
    ]) {
      const existing = properties.find(
        (property) => property.type === 'property' && property.key === key,
      );

      if (existing) {
        existing.value = 'true';
      } else {
        properties.push({ type: 'property', key, value: 'true' });
      }
    }

    return config;
  });

  config = withAppBuildGradle(config, (config) => {
    const source = config.modResults.contents;
    const legacyDefault = /getDefaultProguardFile\((["'])proguard-android\.txt\1\)/g;

    if (legacyDefault.test(source)) {
      config.modResults.contents = source.replace(
        legacyDefault,
        'getDefaultProguardFile("proguard-android-optimize.txt")',
      );
    } else if (!source.includes('proguard-android-optimize.txt')) {
      throw new Error(
        'R8 config plugin could not find the expected ProGuard default in app/build.gradle.',
      );
    }

    return config;
  });

  return config;
}

module.exports = withR8Optimization;
