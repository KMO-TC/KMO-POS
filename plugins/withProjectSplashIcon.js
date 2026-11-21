const fs = require('fs/promises');
const path = require('path');
const { withDangerousMod } = require('@expo/config-plugins');
const { generateImageAsync } = require('@expo/image-utils');

const splashDrawables = [
  ['mdpi', 288],
  ['hdpi', 432],
  ['xhdpi', 576],
  ['xxhdpi', 864],
  ['xxxhdpi', 1152],
];

module.exports = function withProjectSplashIcon(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const splash = config.splash;
      if (!splash || !splash.image) {
        return config;
      }

      const projectRoot = config.modRequest.projectRoot;
      const sourceImage = path.resolve(projectRoot, splash.image);
      const backgroundColor = splash.backgroundColor || '#FFFFFF';
      const resizeMode = splash.resizeMode || 'contain';

      for (const [density, size] of splashDrawables) {
        const image = await generateImageAsync(
          { projectRoot, cacheType: 'project-splash' },
          {
            src: sourceImage,
            width: size,
            height: size,
            resizeMode,
            backgroundColor,
          },
        );
        const drawableDirectory = path.join(
          projectRoot,
          'android',
          'app',
          'src',
          'main',
          'res',
          `drawable-${density}`,
        );

        await fs.mkdir(drawableDirectory, { recursive: true });
        await fs.writeFile(
          path.join(drawableDirectory, 'splashscreen_logo.png'),
          image.source,
        );
      }

      return config;
    },
  ]);
};
