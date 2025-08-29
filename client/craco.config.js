module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Disable source map warnings completely
      webpackConfig.module.rules.forEach(rule => {
        if (rule.loader && rule.loader.includes('source-map-loader')) {
          rule.options = rule.options || {};
          rule.options.filterSourceMappingUrl = () => false;
        }
      });
      
      return webpackConfig;
    }
  }
};
