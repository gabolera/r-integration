const fs = require("fs");
const Papa = require("papaparse");
const path = require("path");

class RRawScriptTemp {
  constructor(_script) {
    this._script = _script;
    this._paramsParse = [];
    this._createdFiles = [];
    this._tempFolder = path.join(path.resolve(__dirname), "..", "temp");
    this._scriptPath = "";
    this._parsed = false;
  }

  addParam(param, value) {
    const exists = this.getParam(param);
    if (exists) {
      exists.value = value;
    } else {
      this._paramsParse.push({
        param: param.toLocaleLowerCase(),
        value,
        randName: (0, this.randomName)(8),
        type: Array.isArray(value) ? "array" : "text",
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
      if (paramValue.type === "array") {
        let filePathInput = this.generateInput(
          paramValue.randName,
          paramValue.value
        );
        this._createdFiles.push(filePathInput);
        let replaceInput = `read.csv(file = '${filePathInput}', header = F, fileEncoding = "UTF-8-BOM", sep = ";", na.strings = '..')`;
        this._script = this._script.replace(match[0], replaceInput);
      } else {
        this._script = this._script.replace(match[0], paramValue.value);
      }
    }
    const regexOutput = /NODE_OUTPUT_TABLE\(['\"`]?(.*?)['\"`]?\)/g;
    let matchOutput;
    while ((matchOutput = regexOutput.exec(this._script))) {
      let randNameOutput = `${this.randomName(11)}_OUT.csv`;
      randNameOutput = path.join(this._tempFolder, randNameOutput);
      let replaceOutputStringR = `write.csv2(${matchOutput[1]}, file = '${randNameOutput}', row.names = FALSE)`;
      this._script = this._script.replace(matchOutput[0], replaceOutputStringR);
      this._createdFiles.push(randNameOutput);
      this._outputFile = randNameOutput;
    }
    // Create R Script
    let scriptName = `${(0, this.randomName)(11)}.r`;
    let scriptCompletePath = path.join(this._tempFolder, scriptName);
    (0, fs.writeFileSync)(scriptCompletePath, this._script);
    this._createdFiles.push(scriptCompletePath);
    this._scriptPath = scriptCompletePath;
    this._parsed = true;
  }

  generateInput(name, dataDbArray) {
    let csv = Buffer.from(
      Papa.unparse(dataDbArray, { delimiter: ";" }),
      "utf8"
    );
    (0, fs.writeFileSync)(`${this._tempFolder}/${name}.csv`, csv);
    return path.join(this._tempFolder, name + ".csv");
  }
  async readOutputData() {
    if (!this._outputFile) {
      return;
    }
    let loadFile = (0, fs.readFileSync)(this._outputFile).toString("utf8");
    let csv = Papa.parse(loadFile, {
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
        (0, fs.unlinkSync)(file);
      } catch (e) {
        deletedErrors.push(file);
      }
    }
    if (deletedErrors.length > 0) {
      console.error(
        `Error on delete temporary files from ${deletedErrors.join(", ")}`
      );
    }
  }

  execute() {
    if (!this._parsed) {
      this.parse();
    }
    if (!this._scriptPath) {
      throw new Error("Script not parsed");
    }
    return this._scriptPath;
  }

  randomName(length) {
    let result = "";
    const characters =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
      counter += 1;
    }
    return result;
  }
}
exports.RRawScriptTemp = RRawScriptTemp;
