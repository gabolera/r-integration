interface ParamInterface {
  param: string;
  value: any;
  randName: string;
  type: 'text' | 'array';
}
export declare class RRawScriptTemp {
  private _script;
  private _paramsParse;
  private _createdFiles;
  private _tempFolder;
  private _scriptPath;
  private _outputFile?;
  private _parsed;
  constructor(_script: string);
  addParam(param: string, value: any | any[]): void;
  getParam(param: string): ParamInterface;
  private parse;
  private generateInput;
  readOutputData(): Promise<any[] | any>;
  deleteTemporaryFiles(): void;
  execute(): string;
  randomName(lenght: number): string;
}
export {};