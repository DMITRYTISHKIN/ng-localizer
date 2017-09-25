#!/usr/bin/env node
"use strict";

var fs = require("fs");
var _ = require("lodash");
var args = process.argv.slice(2);
const { exec } = require('child_process');

/** Input variables
 * arguments:
 * first  - directory where will find keys
 * second - path where will create or change json files
 * third  - type files for search in directory
 * fourth - regex for search keys
 */
var PATH_INPUT  = args[0]; 
var PATH_OUTPUT = args[1];
var LANGUAGES   = ["ru", "en"]
var TYPES_JSON  = new RegExp("([aA-zZ\-]*)\/i18n\/(" + LANGUAGES.join("|") + ")\.json$");
var KEY_REGEX   = /{{ '([aA-zZ0-9._]*)' \| translate }}/g;

// Initialize variebles
var DIFF_KEYS   = {};
var FILES      = [];

var OLD_KEYS   = {};
var JSON_FILES = [];

var NEW_KEYS = {};

LANGUAGES.forEach((lang) => {
  DIFF_KEYS[lang]  = {};
  OLD_KEYS[lang]  = {};
});

// Start module
start();

function start() {
  console.log('[INFO] Starting directory: ' + process.cwd() + '\n');

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

    // Get new keys
    FILES = stdout.split('\n');FILES.pop();
    console.log('[INFO] Found follow new keys of localization:');
    readFiles(FILES, (data) => {
      var key
      while((key = KEY_REGEX.exec(data)) != null){
        setByKey(DIFF_KEYS, key[1], '! NEW !');
        console.log(key[1]);
      }
    });   

    // Get old keys
    JSON_FILES = getFilesByTypes(TYPES_JSON);
    readFiles(JSON_FILES, (data, file) => {
      let charts = file.match(TYPES_JSON)
      OLD_KEYS[charts[2]][charts[1]] = JSON.parse(data);
    });
    console.log('\n[INFO] Detected follow files of localization:\n'+ JSON_FILES.join("\n") + "\n");

    mergeKeys();
    editOrCreateFiles();
  });
}

function editOrCreateFiles(){
  console.log('[INFO] Follow files was changed success:');
  LANGUAGES.forEach((lang) => {
    let plugins = _.keys(NEW_KEYS[lang]);
    plugins.forEach((plugin) => {
      let fileName = PATH_OUTPUT + plugin +  '/i18n/' + lang + '.json';
      if(_.isEqual(NEW_KEYS[lang][plugin], OLD_KEYS[lang][plugin]))
        return;

      fs.writeFile(fileName, JSON.stringify(NEW_KEYS[lang][plugin], null, 2) + '\n', 'utf8', function (err) {
        if (err) {
            return console.log(err);
        }
    
        console.log(' = ' + fileName);
      });
    });
  });
}

function setByKey(object, element, value) {
  LANGUAGES.forEach((lang) => {
    _.set(object[lang], element, value);
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
  let files = _getFiles(PATH_INPUT);

  files = files.filter((file) => {
    return types.test(file);
  });

  return files;
}

function _getFiles(path) {
  let results = [];
  let list = fs.readdirSync(path);

  list.forEach((file) => {
    file = path + '/' + file;
    let stat = fs.statSync(file);

    if (stat && stat.isDirectory())
      results = results.concat(_getFiles(file));
    else
      results.push(file);
  });

  return results;
}