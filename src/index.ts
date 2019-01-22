#!/usr/bin/env node

import {exec, ExecException} from "child_process";
import * as fs from "fs";
import * as _ from "lodash";
import {AngularModule} from "./angularModule";

type Config = {
    FILE_TYPES: string[],
    LANGUAGES: string[],
    KEY_REGEX: string,
    PATH_JSON: string,
    CORE_MODULE_REGEX: string,
    ALLOW_CREATE: boolean
}

console.log("[INFO] Starting directory: " + process.cwd());

// User variables
const args = process.argv.slice(2);

const isFull = commander("--full");
const preserveKeys = commander("--preserve-keys");
const PATH_INPUT: string = args[0];

const {LANGUAGES, KEY_REGEX, ALLOW_CREATE, FILE_TYPES, PATH_JSON, CORE_MODULE_REGEX} = getConfig();

// Initialize variebles
const KEY_REGEX_ = new RegExp(KEY_REGEX, 'g');
const LOCALE_REGEX = new RegExp(PATH_JSON + "(" + LANGUAGES.join("|") + ")\.json$");
const FILES_REGEX = new RegExp('.*\.(' + FILE_TYPES.join("|") + ')$');

let MODULES_AND_KEYS: { [key: string]: string[] } = {};
let MODULES: AngularModule[] = [];

// Start module
if (!isFull) {
    localizerWithGitChange();
} else {
    localizer();
}

function localizer() {
    let modules = AngularModule.getFilesByTypes(new RegExp(CORE_MODULE_REGEX), PATH_INPUT);
    modules.forEach((key: string) => {
        let m = new AngularModule(key, LANGUAGES, isFull, FILES_REGEX, MODULES_AND_KEYS, LOCALE_REGEX);
        MODULES.push(m);
        m.moduleStart(KEY_REGEX_, ALLOW_CREATE, preserveKeys);
    });
}

function localizerWithGitChange() {
    exec(
        'git status -s -u | cut -c4- | grep "' + PATH_INPUT + '" | grep ".' + FILE_TYPES.join("\\|") + '$"',
        (error: ExecException | null, stdout: string): void => {
            if (stdout === '') {
                console.log("No changed files!");
                return;
            }
            if (error) {
                console.error(error);
                return;
            }
            let files = stdout.split('\n');
            files.pop();
            files.forEach((file) => {
                let currentDirectory = file.match(/^([aA-zZ0-9\-_/@]*)\/[aA-zZ0-9\-_.@]*\.[aA-zZ0-9\-_@]*$/)[1];
                let modulePath = detectModules(currentDirectory);
                if (modulePath && typeof modulePath === "string") {
                    if (MODULES_AND_KEYS[modulePath]) {
                        MODULES_AND_KEYS[modulePath].push(file);
                    } else {
                        MODULES_AND_KEYS[modulePath] = [file];
                    }
                } else {
                    console.log("[ERROR] module for " + file + " not found!");
                }
            });

            _.keys(MODULES_AND_KEYS).forEach((key: string) => {
                let m = new AngularModule(key, LANGUAGES, isFull, FILES_REGEX, MODULES_AND_KEYS, LOCALE_REGEX);
                MODULES.push(m);
                m.moduleStart(KEY_REGEX_, ALLOW_CREATE, preserveKeys);
            });
        }
    );
}

function detectModules(currentDirectory: string): string[] | boolean {
    let files = AngularModule.getFiles(currentDirectory);
    let currentModule = files.filter((file: string) => {
        if (/\.module\.ts$/.test(file))
            return file;
    });

    if (!currentModule.length) {
        let prevDirectory = currentDirectory.match(/^([aA-zZ0-9\-_\/@]*)\//);
        if (prevDirectory != null && (currentDirectory = prevDirectory[1])) {
            return detectModules(currentDirectory);
        } else {
            return false;
        }
    } else {
        return currentModule;
    }
}

function getConfig(): Config {
    let conf: Config = {
        FILE_TYPES: ["ts", "html"],
        LANGUAGES: ["ru", "en"],
        KEY_REGEX: "'([aA-zZ0-9._\\-]*)' \\| translate|\\.instant\\('([aA-zZ0-9._\\-]*)'\\)|__\\('([aA-zZ0-9._\\-]*)'\\)",
        PATH_JSON: "[aA-zZ0-9\\-_@]*\\/i18n\\/([aA-zZ0-9\\-_@]*)\\.",
        CORE_MODULE_REGEX: "\\.angularModule.ts$",
        ALLOW_CREATE: true
    };
    try {
        conf = _.merge(conf, require(process.cwd() + "/ng-localizer.config.json"));
        console.log("[INFO] Config file detected\n");
    } catch (ex) {
        fs.writeFile(
            "./ng-localizer.config.json",
            JSON.stringify(conf, null, 2) + '\n',
            function (err: NodeJS.ErrnoException) {
                if (err) {
                    return console.log(err);
                }
            }
        );
    }
    return conf;
}

function commander(command: string): boolean {
    let index = args.indexOf(command);
    if (index !== -1) {
        args.splice(index, 1);
        return true;
    }
    return false;
}
