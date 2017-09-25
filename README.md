# ng-localizer

The picker for search and create/edit translate json files. 

## Installation
Using npm:
> $ npm install --dev ng-localizer

Start script:
> $ ng-localizer \"DIRECTORY_OR_FILE_SEARCH_KEYS\"

Use flag ```--full``` for search keys in whole project. Without it will search in only git change project

## Config
Create config file in project's root (ng-localizer-config.json):
```json
{
  "PATH_OUTPUT" : "src/plugin/",
  "FILE_TYPES"  : ["ts", "html"],
  "LANGUAGES"   : ["ru", "en"],
  "KEY_REGEX"   : "{{ '([aA-zZ0-9._]*)' \\| translate }}",
  "CREATE_FILE" : true
}
```
* PATH_OUTPUT - directory where will generate files of localization
* FILE_TYPES - file types for search
* LANGUAGES - for every key will generate file language
* KEY_REGEX - regular expression for searching keys
* CREATE_FILE - allow create not exist files

## Using

Localizer generate localization files by the following path:
> [PATH_OUTPUT]/(section_project)/i18n/(language).json

Format key should starting with project's section, example:
> header.auth.button_logout
