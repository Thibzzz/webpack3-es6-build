import CleanObsoleteChunks from "webpack-clean-obsolete-chunks";
import BrowserSyncPlugin from "browser-sync-webpack-plugin";
import CompressionPlugin from "compression-webpack-plugin";
import WebpackPwaManifest from "webpack-pwa-manifest";
import ManifestPlugin from "webpack-manifest-plugin";
import UglifyJSPlugin from "uglifyjs-webpack-plugin";
import OfflinePlugin from "offline-plugin";
import notifier from "node-notifier";
import webpack from "webpack";
import chalk from "chalk";
import { each } from "lodash";
import { buildConfig } from "./config/build-config";
import { utils } from "./config/build-utils";
import { config, extractSass } from "./config/webpack.config.basics.babel";
import {
  prodConfig,
  extractSassProd
} from "./config/webpack.config.prod.babel";
const swRuntimeConfig = {
  ServiceWorker: {
    events: true
  }
};

/**
 * Error printing function
 */
const prettyPrintErrors = (err, stats) => {
  if (err) {
    console.error(err);
  }
  // Notify user if there are errors during compilation
  if (stats.compilation.errors && stats.compilation.errors[0]) {
    notifier.notify({
      title: "Jockpack",
      message: "Warning Build !"
    });
    console.log(chalk.red.bold("\n> Build Warnings\n"));
    // console.log();
    each(stats.compilation.errors, (errorValue, errorKey) => {
      console.log(chalk.cyan.bold(`--> Warning n°${errorKey + 1} \n`));
      console.log(chalk.green.bold(`${errorValue} \n`));
    });
  } else {
    console.log(chalk.green.bold("> Build is smooth, good job\n"));
  }
  // performance logging function
  if (stats) {
    const time =
      chalk.yellow.bold((stats.endTime - stats.startTime) / 1000) + " sec";
    console.log("> Built in", time, "\n");
  }
  console.log("> Build complete\n");
};

/**
 * Compiler object that initialize webpack's as an object
 * @constant
 */
let COMPILER = {};
console.log(`\n> Build mode :\n`);
console.log(`--> ${chalk.magenta.bold(process.env.NODE_ENV)}`);
if (buildConfig.productionMode) {
  COMPILER = webpack(prodConfig);
} else {
  COMPILER = webpack(config);
}

/**
 * basics function
 * @function basics
 * @description run basic webpack build tasks
 */
const basics = () => {
  COMPILER.apply(new webpack.ProgressPlugin());
  COMPILER.apply(
    new webpack.optimize.CommonsChunkPlugin({
      name: "vendor",
      // async: true,
      minChunks: 2
    })
  );
  // Remove useless chunks of code
  COMPILER.apply(new CleanObsoleteChunks());
  // Build an assets manifest so it can be used by back-end
  COMPILER.apply(
    new ManifestPlugin({
      fileName: "mix-manifest.json",
      basePath: buildConfig.publicPath,
      seed: {
        name: "Build assets manifest"
      }
    })
  );
  // Apply concatenation strategy to modules contained in webpack chunks
  COMPILER.apply(new webpack.optimize.ModuleConcatenationPlugin());
};

const makePWA = () => {
  COMPILER.apply(new OfflinePlugin(swRuntimeConfig));
  COMPILER.apply(
    new WebpackPwaManifest({
      filename: "manifest-pwa.json",
      orientation: "portrait",
      display: "standalone",
      start_url: "/",
      inject: true,
      fingerprints: false,
      ios: false,
      publicPath: null,
      name: buildConfig.pwa.appName,
      short_name: buildConfig.pwa.shortAppName,
      description: buildConfig.pwa.appDescription,
      background_color: buildConfig.pwa.appColor,
      theme_color: buildConfig.pwa.themeColor,
      icons: [
        {
          src: utils.base(buildConfig.pwa.appLogo),
          sizes: [96, 128, 192, 256, 384, 512] // multiple sizes
        },
        {
          src: utils.base(buildConfig.pwa.appLogo),
          size: "1024x1024" // you can also use the specifications pattern
        }
      ]
    })
  );
};

/**
 * Run function
 * @description executes run methods from webpack library if given object is a valid webpack instance.
 * @function run
 * @param {Object} compilerObject
 */
const run = compilerObject => {
  if (typeof compilerObject.run !== "function") {
    console.error(
      chalk.red.bold("\n>>>>>>>>>>>>>>>>>>>>> ! error ! >>>>>>>>>>>>>>>>\n")
    );
    console.error(
      chalk.red.bold(
        ` ! Your config is invalid as it has not inherited from webpack methods and it can't run, make sure ./webpack/config/build-config.js is well written ! `
      )
    );
    console.error(
      chalk.red.bold("\n>>>>>>>>>>>>>>>>>>>>> !  END  ! >>>>>>>>>>>>>>>>\n")
    );
    return false;
  }
  compilerObject.run((err, stats) => {
    prettyPrintErrors(err, stats);
  });
};

/**
 * Build function
 * @function build
 * @description Run standard build tasks
 */
const build = () => {
  basics();
  // Retrieve css chunks and loads them into a single file with ExtractTextPlugin
  COMPILER.apply(extractSass);
  // Run COMPILER function
  run(COMPILER);
};

/**
 * productionBuild
 * @function productionBuild
 * @description run production version of our webpack build
 */
const productionBuild = () => {
  console.log("\n> Build for production\n");
  // Desactivate DEV mode globally
  COMPILER.apply(
    new webpack.DefinePlugin({
      "process.env": {
        NODE_ENV: '"production"'
      }
    })
  );
  // Run common tasks
  basics();
  // Retrieve css chunks and loads them into a single file with ExtractTextPlugin and apply minification
  COMPILER.apply(extractSassProd);
  // Makes a smaller webpack footprint by giving modules hashes based on the relative path of each module
  COMPILER.apply(new webpack.HashedModuleIdsPlugin());
  // Minify JS code
  COMPILER.apply(
    new UglifyJSPlugin({
      uglifyOptions: {
        safari10: true,
        ecma: 5,
        ie8: false
      }
    })
  );
  // Build up a progressive webapp if you've set it to true in build-config
  if (buildConfig.isPwa) {
    COMPILER.apply(
      new WebpackPwaManifest({
        filename: "manifest-pwa.json",
        orientation: "portrait",
        display: "standalone",
        start_url: "/",
        inject: true,
        fingerprints: false,
        ios: false,
        publicPath: null,
        name: buildConfig.pwa.appName,
        short_name: buildConfig.pwa.shortAppName,
        description: buildConfig.pwa.appDescription,
        background_color: buildConfig.pwa.appColor,
        theme_color: buildConfig.pwa.themeColor,
        icons: [
          {
            src: utils.base(buildConfig.pwa.appLogo),
            sizes: [96, 128, 192, 256, 384, 512] // multiple sizes
          },
          {
            src: utils.base(buildConfig.pwa.appLogo),
            size: "1024x1024" // you can also use the specifications pattern
          }
        ]
      })
    );
  }

  // Makes a compressed (gzip) version of assets so you can serve them instead of server side generation
  COMPILER.apply(
    new CompressionPlugin({
      asset: "[path].gz[query]",
      algorithm: "gzip",
      test: /\.js$|\.css$|\.html$|\.eot?.+$|\.ttf?.+$|\.woff?.+$|\.svg?.+$/,
      threshold: buildConfig.performance.compressionTreshold // Only assets bigger than this size are processed
    })
  );

  return run(COMPILER);
};

const watch = () => {
  console.log("\n> Watching assets\n");

  basics();

  COMPILER.apply(extractSass);

  if (!process.env.WATCH) {
    console.error(
      chalk.red.bold("\n>>>>>>>>>>>>>>>>>>>>> ! error ! >>>>>>>>>>>>>>>>\n")
    );
    console.error(
      chalk.red.bold(
        ` ! You called watch function but your Node environment is not sending a watch variable in process.env.WATCH ! `
      )
    );
    console.error(
      chalk.red.bold("\n>>>>>>>>>>>>>>>>>>>>> !  END  ! >>>>>>>>>>>>>>>>\n")
    );
    return false;
  }

  // build a proxy for your code with hot reload
  COMPILER.apply(
    new BrowserSyncPlugin({
      browser: "google chrome",
      proxy: {
        target: buildConfig.browserSync.target,
      }
    })
  );
  
  // Watch daemon
  const watching = COMPILER.watch(
    {
      aggregateTimeout: 300,
      poll: 1000,
      ignored: /node_modules/
    },
    (err, stats) => {
      prettyPrintErrors(err, stats);
    }
  );
  return watching;
};

// Run pre-build tasks to get file system ready and put thread on hold while its not done
const runPreBuildSteps = new Promise(function(resolve, reject) {
  let goSignal = false;

  // Cleans file system synchronously through callbacks
  const cleaner = () => {
    if (buildConfig.verbose) {
    console.log("\n> Cleaning assets\n");
    }
    // Clean css folder
    return utils.clean(
      `${buildConfig.publicPath + buildConfig.cssPath}/*`,
      () => {
        // Clean js folder
        utils.clean(
          `${buildConfig.publicPath + buildConfig.jsPath}/*`,
          function() {
            goSignal = true;
            return resolve("--> folders cleaned");
          }
        );
      }
    );
  };
  return cleaner();
});

// Runs compiler when pre-build tasks are done
runPreBuildSteps.then(result => {
  if (buildConfig.verbose) {
  console.log("\n> Loading env\n");
  console.log(
    "-->",
    chalk.cyan.bold(`JS source  -`),
    chalk.yellow.bold(
      `${buildConfig.assetsPath + buildConfig.jsPath} |`,
      buildConfig.jsMain
    )
  );
  console.log(
    "-->",
    chalk.cyan.bold(`CSS source -`),
    chalk.yellow.bold(
      `${buildConfig.assetsPath + buildConfig.scssPath} |`,
      buildConfig.scssMain
    )
  );
  console.log(
    "-->",
    chalk.cyan.bold("prod       -"),
    chalk.yellow.bold(buildConfig.productionMode)
  );
  console.log(
    "-->",
    chalk.cyan.bold("watch      -"),
    chalk.yellow.bold(buildConfig.watch)
  );
  }

  if (buildConfig.productionMode) {
    return productionBuild();
  }
  if (buildConfig.watch && !buildConfig.productionMode) {
    return watch();
  }
  return build();
});
