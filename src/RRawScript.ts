import { readFileSync, unlinkSync, writeFileSync } from "fs";
import { RandomName } from './Utils';
import Papa from 'papaparse';
import path from "path";
import R from "./R";

interface ParamInterface {
  param: string;
  value: any;
  randName: string;
  type: 'text' | 'array';
}

export class RRawScript {
  private _paramsParse: ParamInterface[] = [];
  private _createdFiles: string[] = []
  private _tempFolder = path.join(path.resolve(__dirname), "..", "temp");
  private _scriptPath: string = ''
  private _outputFile?: string
  private _parsed = false

  constructor(private _script: string) {}

  addParam(param: string, value: any | any[]) {
    const exists = this._paramsParse.filter((p) => {
      return p.param === param;
    });

    if (exists) {
      exists.values = value;
    } else {
      this._paramsParse.push({
        param: param.toLocaleLowerCase(),
        value,
        randName: RandomName(8),
        type: Array.isArray(value) ? 'array' : 'text'
      });
    }
  }

  getParam(param: string): ParamInterface{
    return this._paramsParse.filter((p) => {
      return p.param === param.toLocaleLowerCase();
    })[0];
  }

  private parse() {
    const regex = /NODE_INJECT\((['"`])(.*?)\1\)/g;
    let match;
    while ((match = regex.exec(this._script))) {
      let paramValue = this.getParam(match[2])

      if(paramValue.type === 'array'){
        let filePathInput = this.generateInput(paramValue.randName, paramValue.value)
        this._createdFiles.push(filePathInput);
        let replaceInput = `read.csv(file = '${filePathInput}', header = T, fileEncoding = "UTF-8-BOM", sep = ";", na.strings = '..')`
        this._script = this._script.replace(match[0], replaceInput)
      }else{
        this._script = this._script.replace(match[0], paramValue.value);
      }
    }

    const regexOutput = /NODE_OUTPUT\((['"`])(.*?)\1\)/g;
    let matchOutput;
    while ((matchOutput = regexOutput.exec(this._script))) {
      let randNameOutput = `${RandomName(11)}_OUT.csv`;
      randNameOutput = path.join(this._tempFolder, randNameOutput)
      let replaceOutputStringR = `write.csv2(data3, file = '${randNameOutput}', row.names = FALSE)`
      this._script = this._script.replace(matchOutput[0], replaceOutputStringR)
      this._createdFiles.push(randNameOutput)
      this._outputFile = randNameOutput
    }

    // Create R Script
    let scriptName = `${RandomName(11)}.r`;
    let scriptCompletePath = path.join(this._tempFolder, scriptName)
    writeFileSync(scriptCompletePath, this._script)
    this._createdFiles.push(scriptCompletePath);
    this._scriptPath = scriptCompletePath

    this._parsed = true
  }

  private generateInput(name: string, dataDbArray: any[]) {
    let csv = Buffer.from(Papa.unparse(dataDbArray, { delimiter: ";" }), "utf8");
    writeFileSync(`${this._tempFolder}/${name}.csv`, csv);
    return path.join(this._tempFolder, name + '.csv');
  }

  async execute(){
    if(!this._parsed){
      this.parse()
    }

    if(!this._scriptPath){
      throw new Error('Script not parsed');
    }

    let results = []
    try {
      await R.executeRScript(this._scriptPath);
      results = await this.readOutputData();
    } catch (e) {
      console.log(e)
    }

    this.deleteTemporaryFiles();

    return results
  }

  private async readOutputData(): Promise<any[] | any> {
    if(!this._outputFile){
      return;
    }

    let loadFile = readFileSync(this._outputFile).toString("utf8");
    let csv = Papa.parse(loadFile, {
      delimiter: ";",
      header: false,
      skipEmptyLines: true,
    });
    csv.data.shift();
    return csv.data;
  }

  private deleteTemporaryFiles() {
    let deletedErrors = [];
    for(const file of this._createdFiles){
      try {
        unlinkSync(file);
      } catch (e) {
        deletedErrors.push(file)
      }
    }

    if(deletedErrors.length > 0){
      console.error(`Error on delete temporary files from ${deletedErrors.join(', ')}`)
    }

  }
}
