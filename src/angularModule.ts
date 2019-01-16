const fs = require("fs");
const path = require("path");
const _ = require("lodash");

type keys = { [key: string]: keys };

class AngularModule {
    private newKeys: keys = {};
    private oldKeys: keys = {};
    private diffKeys: keys = {};
    private readonly nameModule: string;
    private readonly directory: string;
    private readonly i18nDirectory: string;
    private readonly scriptFiles: string[];
    private readonly i18nFiles: string[];

    constructor(
        pathModule: string,
        private languages: string[],
        isFullScan: boolean,
        FILES_REGEX: RegExp,
        MODULES_AND_KEYS: { [key: string]: string[] },
        private LOCALE_REGEX: RegExp
    ) {
        languages.forEach((lang) => {
            this.diffKeys[lang] = {};
            this.oldKeys[lang] = {};
        });
        this.nameModule = pathModule.match(/\/([aA-zZ0-9\-_@]*).module.ts$/)[1];
        this.directory = pathModule.match(/([aA-zZ0-9\-_/@]*)\/[aA-zZ0-9\-_.@]*\.[aA-zZ0-9\-_@]*$/)[1];
        this.i18nDirectory = this.directory + "/i18n";

        this.scriptFiles = isFullScan ? AngularModule.getFilesByTypes(FILES_REGEX, this.directory) : MODULES_AND_KEYS[pathModule];
        this.i18nFiles = AngularModule.getFilesByTypes(LOCALE_REGEX, this.directory);
    }

    public moduleStart(KEY_REGEX: RegExp, ALLOW_CREATE: boolean) {
        console.log("\n[INFO] Start search keys in module '" + this.nameModule + "':");
        // Get new keys
        AngularModule.readFiles(this.scriptFiles, (data) => {
            let key;
            while ((key = KEY_REGEX.exec(data)) != null) {
                let k = key.find((item: string, i: number): boolean => !!(i > 0 && item));
                if (!k) continue;
                AngularModule.setByKey(this.diffKeys, k, '!', this.languages);
            }
        });

        // Get old keys
        AngularModule.readFiles(this.i18nFiles, (data, file) => {
            let charts = file.match(this.LOCALE_REGEX);
            this.oldKeys[charts[2]] = JSON.parse(data);
        });

        // Merge keys
        this.newKeys = _.cloneDeep(this.oldKeys);
        _.defaultsDeep(this.newKeys, this.diffKeys);

        // Sort keys
        this.newKeys = AngularModule.sortByKeys(this.newKeys);

        if (!_.isEqual(this.newKeys, this.oldKeys)) {
            console.log(JSON.stringify(AngularModule.difference(this.newKeys[this.languages[0]], this.oldKeys[this.languages[0]]), null, 2));
            this.editOrCreateFiles(ALLOW_CREATE);
        } else {
            console.log("[INFO] New keys not found!\n")
        }
    }

    editOrCreateFiles(ALLOW_CREATE: boolean) {
        console.log("[INFO] Files were changed: ");
        this.languages.forEach((lang) => {
            let path = this.i18nDirectory + '/' + this.nameModule + '.' + lang;
            let fileName = path + '.json';

            if (_.isEqual(this.newKeys[lang], this.oldKeys[lang])) {
                return;
            }

            if (ALLOW_CREATE) {
                AngularModule.ensureDirectoryExistence(path);
            }

            fs.writeFile(
                fileName,
                JSON.stringify(this.newKeys[lang], null, 2) + '\n',
                {flag: "w"},
                function (err: NodeJS.ErrnoException) {
                    if (err) {
                        return console.log(err);
                    }

                    console.log(' = ' + fileName);
                }
            );
        });
    }

    // Helpers
    static difference(object: keys, base: keys) {
        function changes(object: keys, base: keys): keys {
            return _.transform(object, function (result: keys, value: keys, key: string) {
                if (!_.isEqual(value, base[key])) {
                    result[key] = (_.isObject(value) && _.isObject(base[key])) ? changes(value, base[key]) : value;
                }
            });
        }

        return changes(object, base);
    }

    static sortByKeys(keys: keys): keys {
        return Object.keys(keys).sort().reduce(
            (acc: keys, key: string) => {
                if (typeof keys[key] === "object")
                    keys[key] = AngularModule.sortByKeys(keys[key]);
                acc[key] = keys[key];
                return acc
            }, {});
    }

    static setByKey(object: keys, element: string, value: string, languages: string[]) {
        languages.forEach((lang) => {
            let matched = element.match(/.*\.(.*)|(.*)/);
            let text = matched[1] || matched[2];
            _.set(object[lang], element, value + ' ' + text);
        });
    }

    static ensureDirectoryExistence(filePath: string): boolean {
        let dirname = path.dirname(filePath);
        if (fs.existsSync(dirname)) {
            return true;
        }
        this.ensureDirectoryExistence(dirname);
        fs.mkdirSync(dirname);
        return true;
    }

    public static getFilesByTypes(types: RegExp, directory: string): string[] {
        let files = AngularModule.getFiles(directory);

        files = files.filter((file) => {
            return types.test(file);
        });

        return files;
    }

    public static getFiles(directory: string): string[] {
        if (fs.lstatSync(directory).isFile()) {
            return [directory];
        }
        let results: string[] = [];
        let list = fs.readdirSync(directory);

        list.forEach((file: string) => {
            file = directory + '/' + file;

            let stat = fs.statSync(file);

            if (stat && stat.isDirectory()) {
                results = results.concat(AngularModule.getFiles(file));
            } else {
                results.push(file);
            }
        });

        return results;
    }

    // Method for read files
    static readFiles(files: string[], callback: (data: string, file: string) => void): void {
        files.forEach((file) => {
            try {
                if (!fs.existsSync(file)) return;

                let data = fs.readFileSync(file, "utf8");
                callback(data, file);
            } catch (e) {
                console.error(e)
            }
        });
    }
}

module.exports = AngularModule;
