import notifier from 'node-notifier';
import rimraf from 'rimraf';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { each } from 'lodash';
import figlet from 'figlet';
import buildConfig from './build-config';
import valisetteConf from '../../valisette.conf';

const printLogo = async () => {
  console.log(figlet.textSync("Valisette", {
    font: 'Calvin S',
    horizontalLayout: 'fitted',
  }, (err, data) => {
    if (err) {
      console.log('Something went wrong...');
      console.dir(err);
      return;
    }
    console.log(data);
  }));
};
const assets = param => {
  return path.resolve(__dirname, `./../../${buildConfig.assetsPath}${param}`);
};
const base = param => {
  return path.resolve(__dirname, `./../../${param}`);
};
const printTable = array => {
  if (buildConfig.verbose) {
    const arrayComparator = [];
    if (typeof array === typeof arrayComparator) {
      console.table(array);
      return true;
    }
    console.log(array);
    return true;
  }
  return true;
};
const printObject = object => {
  const objectComparator = {};
  if (buildConfig.verbose) {
    if (typeof object === typeof objectComparator) {
      console.log(JSON.stringify(object, undefined, 2));
      return true;
    }
    console.log(object);
  }
  return true;
};
const print = (...msg) => {
  if (buildConfig.verbose) {
    let msgString = '';
    each(msg, (value, key) => {
      if (key === 0) {
        msgString += `${value}`;
      } else {
        msgString += ` ${value}`;
      }
    });
    return console.log(msgString);
  }
  return true;
};
const processInstance = process;
const printInStream = msg => {
  processInstance.stdout.clearLine();
  processInstance.stdout.cursorTo(0);
  return processInstance.stdout.write(msg);
};
const endPrintInStream = () => {
  processInstance.exit();
};
const progressHandler = (percentage, message = 'Nothing') => {
  let printMsg = message;
  if (message === '') {
    printMsg = "I'm Idle";
  }
  // const otherArguments = args;
  if (Math.round(percentage * 100) === 100) {
    printMsg += '\n\n';
  }
  return printInStream(
    `> ${chalk.magenta.bold('Compilation at : ')}${chalk.yellow.bold(
      Math.round(percentage * 100, 2)
    )} ${chalk.yellow.bold('%')} ${chalk.magenta.bold(
      '|'
    )} ${chalk.magenta.bold('Compiler says :')} ${chalk.yellow.bold(printMsg)}`
  );
};
/**
 * Error printing function
 */
const prettyPrintErrors = (err, stats) => {
  let finalStatsLog = '';
  // Notify user if there are errors during compilation
  if (stats.compilation.errors && stats.compilation.errors[0]) {
    if (buildConfig.notifications) {
      notifier.notify({
        title: 'Valisette',
        message: `Build has ${stats.compilation.errors.length} error(s) !`
      });
    }
    finalStatsLog += `\n> ${chalk.magenta.bold(
      `Build has ${chalk.yellow.bold(stats.compilation.errors.length)} errors`
    )}\n`;
  }
  if (
    stats.compilation.warnings &&
    stats.compilation.warnings[0] &&
    !buildConfig.ignoreWarnings
  ) {
    if (buildConfig.notifications) {
      notifier.notify({
        title: 'Valisette',
        message: `Build has ${stats.compilation.warnings.length} warning(s) !`
      });
    }
    finalStatsLog += `\n> ${chalk.magenta.bold(
      `Build has ${chalk.yellow.bold(
        stats.compilation.warnings.length
      )} warnings`
    )}\n`;
  }
  if (
    !stats.compilation.errors ||
    !stats.compilation.warnings ||
    buildConfig.ignoreWarnings
  ) {
    finalStatsLog = `> ${chalk.green.bold('All good, great job !')}\n`;
  }
  console.log(finalStatsLog);
  // performance logging function
  if (stats && valisetteConf.PERFORMANCE_LOG_LEVEL) {
    const time = chalk.yellow.bold((stats.endTime - stats.startTime) / 1000);
    console.log(
      `> ${chalk.magenta.bold('Built in ')}${time} ${chalk.magenta.bold(
        'sec'
      )}\n`
    );
  }
  if (process.env.WATCH) {
    console.log(`> ${chalk.yellow.bold('Watching for changes...')}\n`);
  } else {
    console.log(`> ${chalk.magenta.bold('Build complete')}\n`);
  }
  return err;
};
const loadImagesFolder = () => {
  const filesList = [];
  // load images
  const imageFolderUrl = `.${path.resolve(
    `${buildConfig.publicPath + buildConfig.imagesPath}`
  )}`;
  fs.readdirSync(imageFolderUrl).forEach(file => {
    filesList.push(`/${buildConfig.imagesPath + file}`);
  });
  if (buildConfig.verbose) {
    console.log(`> ${chalk.magenta.bold('Cached Images : ')}`);
    console.table(filesList);
  }
  return filesList;
};
const clean = async (
  param,
  callback = () => {
    return true;
  }
) => {
  const target = path.resolve(__dirname, `./../../${param}`);
  const msg1 = `> ${chalk.cyan.bold('cleaning   -')} ${chalk.yellow.bold(
    target
  )}`;
  if (buildConfig.verbose) {
    console.log(msg1);
  }
  await rimraf(target, () => {
    const msg2 = `> ${chalk.cyan.bold('cleaned   -')} ${chalk.yellow.bold(
      target
    )}`;
    if (buildConfig.verbose) {
      console.log(msg2);
    }
    return callback();
  });
};
const buildEntriesObject = (pathString, entriesArray) => {
  const resultObject = {};
  each(entriesArray, key => {
    const finalString = assets(`${pathString + key}`);
    const finalKey = key.split('.')[0];
    resultObject[finalKey] = finalString;
  });
  return resultObject;
};
const buildJsEntriesObject = entriesArray => {
  return buildEntriesObject(buildConfig.jsPath, entriesArray);
};
const utils = {
  endPrintInStream,
  progressHandler,
  printObject,
  printTable,
  print,
  prettyPrintErrors,
  assets,
  base,
  clean,
  loadImagesFolder,
  jsEntries: buildJsEntriesObject,
  printLogo
};
export default utils;
