#!/usr/bin/env node
"use strict";

var fs       = require("fs");
var _        = require("lodash");
var { exec } = require('child_process');
var path     = require('path');

// User variables
var args       = process.argv.slice(2);

var isGit      = commander("--git");
var isConfig   = commander("--config");
var PATH_INPUT = args[0];

var { PATH_OUTPUT, LANGUAGES, KEY_REGEX, ALLOW_CREATE } = getConfig();

// Initialize variebles
    KEY_REGEX  = new RegExp(KEY_REGEX, 'g');
var TYPES_JSON = new RegExp("([aA-zZ\-]*)\/i18n\/(" + LANGUAGES.join("|") + ")\.json$");
var FILES      = getFiles(PATH_INPUT);
var JSON_FILES = [];
var DIFF_KEYS  = {};
var OLD_KEYS   = {};
var NEW_KEYS   = {};

LANGUAGES.forEach((lang) => {
  DIFF_KEYS[lang] = {};
  OLD_KEYS[lang]  = {};
});

// Start module
start();

function start() {
  console.log('[INFO] Starting directory: ' + process.cwd() + '\n');

  if(isGit)
    localizerWithGitChange();
  else
    localizer();
}

function localizer(){
  // Get new keys
  console.log('[INFO] Found follow new keys of localization:');
  readFiles(FILES, (data, file) => {
    var key
    console.log(KEY_REGEX)
    while((key = KEY_REGEX.exec(data)) != null){
      setByKey(DIFF_KEYS, key[1], '! NEW !');
      console.log(" + " + key[1]);
    }
  });   

  // Get diff keys
  JSON_FILES = getFilesByTypes(TYPES_JSON);
  readFiles(JSON_FILES, (data, file) => {
    let charts = file.match(TYPES_JSON)
    OLD_KEYS[charts[2]][charts[1]] = JSON.parse(data);
  });
  console.log('\n[INFO] Detected follow files of localization:\n'+ JSON_FILES.join("\n") + "\n");

  mergeKeys();
  editOrCreateFiles();
}

function localizerWithGitChange(){
  exec('git status -s | cut -c4- | grep "' + PATH_INPUT + '"', (error, stdout) => {
    if (error) {
      console.error('exec error: ${error}');
      return;
    }
    if (stdout == '') {
      console.log('No changed files!');
      return;
    }
    console.log('[INFO] Found change files by "'+ PATH_INPUT +'":\n' + stdout);

    FILES = stdout.split('\n');FILES.pop();
    localizer();
  });
}

function editOrCreateFiles(){
  console.log('[INFO] Follow files was changed success:');
  LANGUAGES.forEach((lang) => {
    let plugins = _.keys(NEW_KEYS[lang]);
    plugins.forEach((plugin) => {
      let path = './' + PATH_OUTPUT + plugin +  '/i18n/' + lang;
      let fileName =  path + '.json';
      if(_.isEqual(NEW_KEYS[lang][plugin], OLD_KEYS[lang][plugin]))
        return;

      if(ALLOW_CREATE)
        ensureDirectoryExistence(path);

      fs.writeFile(fileName, JSON.stringify(NEW_KEYS[lang][plugin], null, 2) + '\n', {flag: "wx+"}, function (err) {
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


//helpers

function setByKey(object, element, value) {
  LANGUAGES.forEach((lang) => {
    _.set(object[lang], element, value);
  });
}

function getConfig(){
  let conf = {
    PATH_OUTPUT : "src/plugin/",
    LANGUAGES   : ["ru", "en"],
    KEY_REGEX   : "/{{ '([aA-zZ0-9._]*)' \\| translate }}",
    ALLOW_CREATE : true,
    ALLOW_REMOVE : false
  }

  if(isConfig){
    try {
      conf = require(process.cwd() + '/ng-localizer.config.json');
      console.log("[INFO] config file detected");
      return conf;
    } 
    catch (ex) {
      fs.writeFile('./ng-localizer.config.json', JSON.stringify(conf, null, 2) + '\n', function (err) {
        if (err) {
            return console.log(err);
        }
      });

      return conf;
    }
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
  var dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) {
    return true;
  }
  ensureDirectoryExistence(dirname);
  fs.mkdirSync(dirname);
}