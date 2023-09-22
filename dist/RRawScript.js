"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RRawScript = void 0;
const fs_1 = require("fs");
const Utils_1 = require("./Utils");
const papaparse_1 = __importDefault(require("papaparse"));
const path_1 = __importDefault(require("path"));
const R_1 = __importDefault(require("./R"));
class RRawScript {
    constructor(_script) {
        this._script = _script;
        this._paramsParse = [];
        this._createdFiles = [];
        this._tempFolder = path_1.default.join(path_1.default.resolve(__dirname), "..", "temp");
        this._scriptPath = '';
        this._parsed = false;
    }
    addParam(param, value) {
        const exists = this._paramsParse.filter((p) => {
            return p.param === param;
        });
        if (exists) {
            exists.values = value;
        }
        else {
            this._paramsParse.push({
                param: param.toLocaleLowerCase(),
                value,
                randName: (0, Utils_1.RandomName)(8),
                type: Array.isArray(value) ? 'array' : 'text'
            });
        }
    }
    getParam(param) {
        return this._paramsParse.filter((p) => {
            return p.param === param.toLocaleLowerCase();
        })[0];
    }
    parse() {
        const regex = /NODE_INJECT\((['"`])(.*?)\1\)/g;
        let match;
        while ((match = regex.exec(this._script))) {
            let paramValue = this.getParam(match[2]);
            if (paramValue.type === 'array') {
                let filePathInput = this.generateInput(paramValue.randName, paramValue.value);
                this._createdFiles.push(filePathInput);
                let replaceInput = `read.csv(file = '${filePathInput}', header = T, fileEncoding = "UTF-8-BOM", sep = ";", na.strings = '..')`;
                this._script = this._script.replace(match[0], replaceInput);
            }
            else {
                this._script = this._script.replace(match[0], paramValue.value);
            }
        }
        const regexOutput = /NODE_OUTPUT\((['"`])(.*?)\1\)/g;
        let matchOutput;
        while ((matchOutput = regexOutput.exec(this._script))) {
            let randNameOutput = `${(0, Utils_1.RandomName)(11)}_OUT.csv`;
            randNameOutput = path_1.default.join(this._tempFolder, randNameOutput);
            let replaceOutputStringR = `write.csv2(data3, file = '${randNameOutput}', row.names = FALSE)`;
            this._script = this._script.replace(matchOutput[0], replaceOutputStringR);
            this._createdFiles.push(randNameOutput);
            this._outputFile = randNameOutput;
        }
        // Create R Script
        let scriptName = `${(0, Utils_1.RandomName)(11)}.r`;
        let scriptCompletePath = path_1.default.join(this._tempFolder, scriptName);
        (0, fs_1.writeFileSync)(scriptCompletePath, this._script);
        this._createdFiles.push(scriptCompletePath);
        this._scriptPath = scriptCompletePath;
        this._parsed = true;
    }
    generateInput(name, dataDbArray) {
        let csv = Buffer.from(papaparse_1.default.unparse(dataDbArray, { delimiter: ";" }), "utf8");
        (0, fs_1.writeFileSync)(`${this._tempFolder}/${name}.csv`, csv);
        return path_1.default.join(this._tempFolder, name + '.csv');
    }
    async execute() {
        if (!this._parsed) {
            this.parse();
        }
        if (!this._scriptPath) {
            throw new Error('Script not parsed');
        }
        let results = [];
        try {
            await R_1.default.executeRScript(this._scriptPath);
            results = await this.readOutputData();
        }
        catch (e) {
            console.log(e);
        }
        this.deleteTemporaryFiles();
        return results;
    }
    async readOutputData() {
        if (!this._outputFile) {
            return;
        }
        let loadFile = (0, fs_1.readFileSync)(this._outputFile).toString("utf8");
        let csv = papaparse_1.default.parse(loadFile, {
            delimiter: ";",
            header: false,
            skipEmptyLines: true,
        });
        csv.data.shift();
        return csv.data;
    }
    deleteTemporaryFiles() {
        let deletedErrors = [];
        for (const file of this._createdFiles) {
            try {
                (0, fs_1.unlinkSync)(file);
            }
            catch (e) {
                deletedErrors.push(file);
            }
        }
        if (deletedErrors.length > 0) {
            console.error(`Error on delete temporary files from ${deletedErrors.join(', ')}`);
        }
    }
}
exports.RRawScript = RRawScript;
