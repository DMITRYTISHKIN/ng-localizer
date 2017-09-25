# ng-localizer

The picker for search and create/edit translate json files. 

## Installation
Using npm:
> $ npm install --save ng-localizer

Start script:
> $ ng-localizer \"DIRECTORY_OR_FILE_SEARCH_KEYS\"

## Config
Create config file in project's root (ng-localizer-config.json):
```json
{
  "PATH_OUTPUT" : "src/plugin/",
  "LANGUAGES"   : ["ru", "en"],
  "KEY_REGEX"   : "{{ '([aA-zZ0-9._]*)' \\| translate }}",
  "CREATE_FILE" : true,
  "REMOVE_FILE" : false
}
```
* PATH_OUTPUT - directory where will generate files of localization
* LANGUAGES - for every key will generate file language
* KEY_REGEX - regular expression for searching keys
* CREATE_FILE - allow create not exist files
* REMOVE_FILE - allow remove files of localization if not exist keys for section

## Using

Localizer generate localization files by the following path:
> [PATH_OUTPUT]/(section_project)/i18n/(language).json

Format key should starting with project's section, example:
> header.auth.button_logout
