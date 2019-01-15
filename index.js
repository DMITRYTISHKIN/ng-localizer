#!/usr/bin/env node
"use strict";

class Module {
  constructor(pathModule){
    this.newKeys  = {};
    this.oldKeys  = {};
    this.diffKeys = {};

    LANGUAGES.forEach((lang) => {
      this.diffKeys[lang] = {};
      this.oldKeys[lang]  = {};
    });
    this.nameModule    = pathModule.match(/\/([aA-zZ0-9\-_@]*).module.ts$/)[1];
    this.directory     = pathModule.match(/([aA-zZ0-9\-_/@]*)\/[aA-zZ0-9\-_\.@]*\.[aA-zZ0-9\-_@]*$/)[1];
    this.i18nDirectory = this.directory + "/i18n";

    this.scriptFiles = isFull ? Module.getFilesByTypes(FILES_REGEX, this.directory) : MODULES_AND_KEYS[pathModule];
    this.i18nFiles   = Module.getFilesByTypes(LOCALE_REGEX, this.directory);
  }

  moduleStart(){
    console.log("\n[INFO] Start search keys in module '" + this.nameModule + "':");
    // Get new keys
    Module.readFiles(this.scriptFiles, (data, file) => {
      let key;
      while ((key = KEY_REGEX.exec(data)) != null) {
        let k = key.find((item, i) => i > 0 && item);
        if (!k) continue;
        Module.setByKey(this.diffKeys, k, '!');
      }
    });

    // Get old keys
    Module.readFiles(this.i18nFiles, (data, file) => {
      let charts = file.match(LOCALE_REGEX)
      this.oldKeys[charts[2]] = JSON.parse(data);
    });

    // Merge keys
    this.newKeys = _.cloneDeep(this.oldKeys);
    _.defaultsDeep(this.newKeys, this.diffKeys);

    // Sort keys
    this.newKeys = Module.sortByKeys(this.newKeys);

    if (!_.isEqual(this.newKeys, this.oldKeys)) {
      console.log(JSON.stringify(Module.difference(this.newKeys[LANGUAGES[0]], this.oldKeys[LANGUAGES[0]]), null, 2));
      this.editOrCreateFiles();
    } else {
      console.log("[INFO] New keys not found!\n")
    }
  }

  editOrCreateFiles() {
    console.log("[INFO] Files were changed: ");
    LANGUAGES.forEach((lang) => {
      let path = this.i18nDirectory + '/' + this.nameModule + '.' + lang;
      let fileName =  path + '.json';

      if (_.isEqual(this.newKeys[lang], this.oldKeys[lang])) {
        return;
      }

      if (ALLOW_CREATE) {
        Module.ensureDirectoryExistence(path);
      }

      fs.writeFile(fileName, JSON.stringify(this.newKeys[lang], null, 2) + '\n', {flag: "w"}, function (err) {
        if (err) {
          return console.log(err);
        }

        console.log(' = ' + fileName);
      });
    });
  }

  // Helpers
  static difference(object, base) {
    function changes(object, base) {
      return _.transform(object, function(result, value, key) {
        if (!_.isEqual(value, base[key])) {
          result[key] = (_.isObject(value) && _.isObject(base[key])) ? changes(value, base[key]) : value;
        }
      });
    }
    return changes(object, base);
  }

  static sortByKeys(keys) {
    return Object.keys(keys).sort().reduce(
      (acc, key) => {
        if(typeof keys[key] === "object")
          keys[key] = Module.sortByKeys(keys[key]);
        acc[key] = keys[key];
        return acc
      }, {});
  }

  static setByKey(object, element, value) {
    LANGUAGES.forEach((lang) => {
      let text = element.match(/.*\.(.*)|(.*)/);
      text = text[1] || text[2];
      _.set(object[lang], element, value + ' ' + text);
    });
  }

  static ensureDirectoryExistence(filePath) {
    let dirname = path.dirname(filePath);
    if (fs.existsSync(dirname)) {
      return true;
    }
    this.ensureDirectoryExistence(dirname);
    fs.mkdirSync(dirname);
  }

  static getFilesByTypes(types, directory) {
    let files = Module.getFiles(directory);

    files = files.filter((file) => {
      return types.test(file);
    });

    return files;
  }

  static getFiles(directory) {
    if (fs.lstatSync(directory).isFile()) {
      return [directory];
    }
    let results = [];
    let list = fs.readdirSync(directory);

    list.forEach((file) => {
      file = directory + '/' + file;

      let stat = fs.statSync(file);

      if (stat && stat.isDirectory()){
        results = results.concat(Module.getFiles(file));
      } else {
        results.push(file);
      }
    });

    return results;
  }

  // Method for read files
  static readFiles(files, callback) {
    files.forEach((file) => {
      try{
        if(!fs.existsSync(file)) return;

        let data = fs.readFileSync(file, "utf8");
        callback(data, file);
      }
      catch (e) {
        console.error(e)
      }
    });
  }
}

var fs       = require("fs");
var _        = require("lodash");
var { exec } = require("child_process");
var path     = require("path");

console.log("[INFO] Starting directory: " + process.cwd());

// User variables
var args       = process.argv.slice(2);

var isFull     = commander("--full");
var PATH_INPUT = args[0];

var { LANGUAGES, KEY_REGEX, ALLOW_CREATE, FILE_TYPES, PATH_JSON, CORE_MODULE_REGEX } = getConfig();

// Initialize variebles
    KEY_REGEX    = new RegExp(KEY_REGEX, 'g');
var LOCALE_REGEX = new RegExp(PATH_JSON + "(" + LANGUAGES.join("|") + ")\.json$");
var FILES_REGEX  = new RegExp('.*\.(' + FILE_TYPES.join("|") + ')$')

var MODULES_AND_KEYS = {};
var MODULES = [];

// Start module
if (!isFull) {
  localizerWithGitChange();
} else {
  localizer();
}

function localizer() {
  let modules = Module.getFilesByTypes(new RegExp(CORE_MODULE_REGEX), PATH_INPUT);
  modules.forEach((key) => {
    let m = new Module(key);
    MODULES.push(m);
    m.moduleStart();
  });
}

function localizerWithGitChange() {
  exec('git status -s -u | cut -c4- | grep "' + PATH_INPUT + '" | grep ".' + FILE_TYPES.join("\\|") + '$"', (error, stdout) => {
    if (stdout == '') {
      console.log("No changed files!");
      return;
    }
    if (error) {
      console.error(error);
      return;
    }
    let files = stdout.split('\n');files.pop();
    files.forEach((file) => {
      let currentDirectory = file.match(/^([aA-zZ0-9\-_/@]*)\/[aA-zZ0-9\-_\.@]*\.[aA-zZ0-9\-_@]*$/)[1];
      let modulePath = detectModules(currentDirectory);
      if (modulePath) {
        if (MODULES_AND_KEYS[modulePath]) {
          MODULES_AND_KEYS[modulePath].push(file);
        } else {
          MODULES_AND_KEYS[modulePath] = [file];
        }
      } else {
        console.log("[ERROR] module for " + file + " not found!");
      }
    });

    _.keys(MODULES_AND_KEYS).forEach((key) => {
      let m = new Module(key);
      MODULES.push(m);
      m.moduleStart();
    });
  });
}

function detectModules(currentDirectory) {
  let files = Module.getFiles(currentDirectory);
  let currentModule = files.filter((file) => {
    if (/\.module\.ts$/.test(file))
      return file;
  });

  if (!currentModule.length) {
    let prevDirectory = currentDirectory.match(/^([aA-zZ0-9\-_\/@]*)\//);
    if (prevDirectory != null && (currentDirectory = prevDirectory[1])) {
      currentModule = detectModules(currentDirectory);
      return currentModule;
    } else {
      return false;
    }
  } else {
    return currentModule;
  }
}

function getConfig() {
  let conf = {
    FILE_TYPES   : ["ts", "html"],
    LANGUAGES    : ["ru", "en"],
    KEY_REGEX    : "'([aA-zZ0-9._\\-]*)' \\| translate|\\.instant\\('([aA-zZ0-9._\\-]*)'\\)|__\\('([aA-zZ0-9._\\-]*)'\\)",
    PATH_JSON    : "[aA-zZ0-9\\-_@]*\\/i18n\\/([aA-zZ0-9\\-_@]*)\\.",
    CORE_MODULE_REGEX : "\\.module.ts$",
    ALLOW_CREATE : true
  }
  try {
    conf = _.merge(conf, require(process.cwd() + "/ng-localizer.config.json"));
    console.log("[INFO] Config file detected\n");
  } catch (ex) {
    fs.writeFile("./ng-localizer.config.json", JSON.stringify(conf, null, 2) + '\n', function (err) {
      if (err) {
        return console.log(err);
      }
    });
  }
  return conf;
}

function commander(command) {
  let index = args.indexOf(command);
  if (index != -1) {
    args.splice(index, 1);
    return true;
  }
  return false;
}
