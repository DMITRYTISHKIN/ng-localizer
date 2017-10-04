#!/usr/bin/env node
"use strict";

var fs       = require("fs");
var _        = require("lodash");
var { exec } = require('child_process');
var path     = require('path');

console.log('[INFO] Starting directory: ' + process.cwd());

// User variables
var args       = process.argv.slice(2);

var isFull     = commander("--full");
var PATH_INPUT = args[0];

var { PATH_OUTPUT, LANGUAGES, KEY_REGEX, ALLOW_CREATE, FILE_TYPES, PATH_JSON } = getConfig();

// Initialize variebles
    KEY_REGEX  = new RegExp(KEY_REGEX, 'g');
var TYPES_JSON = new RegExp(PATH_JSON + "(" + LANGUAGES.join("|") + ")\.json$");
var FILES      = getFilesByTypes(new RegExp('.*\.(' + FILE_TYPES.join("|") + ')$'));
var JSON_FILES = [];
var DIFF_KEYS  = {};
var OLD_KEYS   = {};
var NEW_KEYS   = {};

LANGUAGES.forEach((lang) => {
  DIFF_KEYS[lang] = {};
  OLD_KEYS[lang]  = {};
});

// Start module
if(!isFull) {
  localizerWithGitChange();
}
else {
  localizer();
}

function localizer(){
  // Get new keys
  console.log('[INFO] Found follow new keys of localization:');
  readFiles(FILES, (data, file) => {
    let key;
    while((key = KEY_REGEX.exec(data)) != null){
      let k = key[1] ? key[1] : key[2]
      setByKey(DIFF_KEYS, k, '! NEW !');
      console.log(" + " + k);
    }
  });   

  // Get diff keys
  JSON_FILES = getFilesByTypes(TYPES_JSON);
  readFiles(JSON_FILES, (data, file) => {
    let charts = file.match(TYPES_JSON)
    OLD_KEYS[charts[2]][charts[1]] = JSON.parse(data);
  });
  console.log('\n[INFO] Detected follow files of localization:\n > '+ JSON_FILES.join("\n > ") + "\n");

  mergeKeys();

  if(!_.isEqual(NEW_KEYS, OLD_KEYS))
    editOrCreateFiles();
  else{
    console.log('[INFO] New keys were added!\n')
  }
}

function localizerWithGitChange(){
  exec('git status -s -u | cut -c4- | grep "' + PATH_INPUT + '" | grep ".' + FILE_TYPES.join("\\|") + '$"', (error, stdout) => {
    if (error) {
      console.error(error);
      return;
    }
    if (stdout == '') {
      console.log('No changed files!');
      return;
    }
    FILES = stdout.split('\n');FILES.pop();
    console.log('[INFO] Found change files by "'+ PATH_INPUT +'":\n > ' + FILES.join("\n > ") + "\n");
    localizer();
  });
}

function editOrCreateFiles(){
  console.log('[INFO] Follow files was changed success:');
  LANGUAGES.forEach((lang) => {
    let plugins = _.keys(NEW_KEYS[lang]);
    plugins.forEach((plugin) => {
      let path = './' + PATH_OUTPUT + plugin +  '/i18n/' + plugin + '.' + lang;
      let fileName =  path + '.json';

      if(_.isEqual(NEW_KEYS[lang][plugin], OLD_KEYS[lang][plugin]))
        return;

      if(ALLOW_CREATE)
        ensureDirectoryExistence(path);

      fs.writeFile(fileName, JSON.stringify(NEW_KEYS[lang][plugin], null, 2) + '\n', {flag: "w"}, function (err) {
        if (err) {
            return console.log(err);
        }
    
        console.log(' = ' + fileName);
      });
    });
  });
}

// Method for merge keys
function mergeKeys() {
  NEW_KEYS = _.cloneDeep(OLD_KEYS);
  _.defaultsDeep(NEW_KEYS, DIFF_KEYS);
}

// Method for read files
function readFiles(files, callback) {
  files.forEach((file) => {
    try{
      if(!fs.existsSync(file))
        return;

      let data = fs.readFileSync(file, 'utf8');
      callback(data, file);
    }
    catch (e) {
      console.error(e)
    }
  });
}

// Methods for search files by types
function getFilesByTypes(types) {
  let files = getFiles(PATH_INPUT);

  files = files.filter((file) => {
    return types.test(file);
  });

  return files;
}

function getFiles(path) {
  if(fs.lstatSync(path).isFile()){
    return [path];
  }
  let results = [];
  let list = fs.readdirSync(path);

  list.forEach((file) => {
    file = path + '/' + file;
    let stat = fs.statSync(file);

    if (stat && stat.isDirectory())
      results = results.concat(getFiles(file));
    else
      results.push(file);
  });

  return results;
}


// Helpers
function setByKey(object, element, value) {
  LANGUAGES.forEach((lang) => {
    _.set(object[lang], element, value);
  });
}

function getConfig(){
  let conf = {
    PATH_OUTPUT  : "src/plugins/",
    FILE_TYPES   : ["ts", "html"],
    LANGUAGES    : ["ru", "en"],
    KEY_REGEX    : "{{ '([aA-zZ0-9._]*)' \\| translate }}|\\.instant\\('([aA-zZ0-9._]*)'\\)",
    PATH_JSON    : "[aA-zZ\\-_]*\\/i18n\\/([aA-zZ\\-]*)\\.",
    ALLOW_CREATE : true
  }
  try {
    conf = require(process.cwd() + '/ng-localizer.config.json');
    console.log("[INFO] Config file detected");
  } 
  catch (ex) {
    fs.writeFile('./ng-localizer.config.json', JSON.stringify(conf, null, 2) + '\n', function (err) {
      if (err) {
        return console.log(err);
      }
    });
  }
  return conf;
}

function commander(command){
  let index = args.indexOf(command);
  if(index != -1) {
    console.log(index);
    args.splice(index, 1);
    return true
  }
  return false;
}

function ensureDirectoryExistence(filePath) {
  let dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) {
    return true;
  }
  ensureDirectoryExistence(dirname);
  fs.mkdirSync(dirname);
}