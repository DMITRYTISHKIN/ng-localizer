# ng-localizer

The picker for search and create/edit translate json files. 

## Installation
Using npm:
> $ npm install --dev ng-localizer

Add script to package.json:
```json
"scripts": {
  "ng-localizer": "ng-localizer \"DIRECTORY_OR_FILE_SEARCH_KEYS\""
}
```

## Using

Run
> $ npm run ng-localizer

Use flag ```--full``` for search keys in whole project. Without it will search in only git change project
Use flag ```--preserve-keys``` for preserve keys in project. Without it will delete unused keys

## Config
You can customize autocreating config file in project's root (ng-localizer.config.json):
```json
{
  "FILE_TYPES"   : ["ts", "html"],
  "LANGUAGES"    : ["ru", "en"],
  "KEY_REGEX"    : "'([aA-zZ0-9._\\-]*)' \\| translate|\\.instant\\('([aA-zZ0-9._\\-]*)'\\)|__\\('([aA-zZ0-9._\\-]*)'\\)",
  "PATH_JSON"    : "[aA-zZ0-9\\-_@]*\\/i18n\\/([aA-zZ0-9\\-_@]*)\\.",
  "CORE_MODULE_REGEX" : "\\.module.ts$",
  "ALLOW_CREATE" : true
}
```
* FILE_TYPES - file types for search
* LANGUAGES - for every key will generate file language
* KEY_REGEX - default regular expressions for searching keys:
  * `([aA-zZ0-9._\\-]*)' \\| translate`  -> `'something.key' | translate`
  * `.instant\\('([aA-zZ0-9._\\-]*)'\\)` -> `'.instant('something.key')`
  * `__\\('([aA-zZ0-9._\\-]*)'\\)`       -> `'__('something.key')`
* PATH_JSON - path for localization json files
* CORE_MODULE_REGEX - regexp for find core modules
* ALLOW_CREATE - allow create not exist files
