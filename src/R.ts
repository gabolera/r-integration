import { spawn, spawnSync } from "child_process";
import { existsSync, readdirSync } from "fs";
import { join } from "path";
import { RRawScript } from './RRawScript';

type OSType = "win" | "lin" | "mac";

/**
 * Get the current Operating System name
 * 
 * @returns {OSType} the operating system short name 
 */
function getCurrentOs(): OSType {
  var processPlatform = process.platform;
  var currentOs: OSType;

  if (processPlatform === "win32") {
    currentOs = "win";
  } else if (
    processPlatform === "linux" ||
    processPlatform === "openbsd" ||
    processPlatform === "freebsd"
  ) {
    currentOs = "lin";
  } else {
    currentOs = "mac";
  }

  return currentOs;
}

/**
 * Execute a command in the OS shell (used to execute R command)
 *
 * @param {string} command the command to execute
 * @param {String[]} args an array of parameters to be passed to the command
 * @returns {{string, string}} the command execution result
 */
function executeShellCommand(command: string, args: string[]) {
  let stdout;
  let stderr;

  let exec_res = spawnSync(command, args, { encoding: "utf8" });
  stdout = exec_res.stdout;
  stderr = exec_res.stderr;

  return {
    stdout,
    stderr,
  };
}

/**
 * Execute a command in the OS shell (used to execute R command) asynchronously 
 *
 * @param {string} command the command to execute
 * @param {String[]} args an array of parameters to be passed to the command
 * @returns {Promise<string>} the command execution result
 */
function executeShellCommandAsync(
  command: string,
  args: string[]
): Promise<string> {
  return new Promise(async (resolve, reject) => {
    var stdout = "";
    var stderr = "";

    let process = spawn(command, args);

    process.stdout.on("data", (data) => {
      data = data.toString();
      stdout += data;
    });

    process.stderr.on("data", (data) => {
      data = data.toString();
      stderr += data;
    });

    process.on("exit", (code) => {
      if (code !== 0) {
        reject(
          command +
            " " +
            args.join(" ") +
            " exited with code " +
            code +
            " and error: " +
            stderr
        );
      } else {
        resolve(stdout);
      }
    });
  });
}

/**
 * Check if Rscript(R) is installed od the system and returns the path where the
 * binary is installed
 *
 * @param {string} path alternative path to use as binaries directory
 * @returns {string} the path where the Rscript binary is installed, 0 otherwise
 */
function isRscriptInstallaed(path?: string): string | false {
  var installationDir: string | boolean = false;

  switch (getCurrentOs()) {
    case "win":
      if (!path) {
        path = join("C:\\Program Files\\R");
      }

      if (existsSync(path)) {
        // Rscript is installed, let's find the path (version problems)
        let dirContent = readdirSync(path);
        if (dirContent.length != 0) {
          let lastVersion = dirContent[dirContent.length - 1];
          installationDir = join(path, lastVersion, "bin", "Rscript.exe");
        }
      }
      break;
    case "mac":
    case "lin":
      if (!path) {
        // the command "which" is used to find the Rscript installation
        // directory
        path = executeShellCommand("which", ["Rscript"]).stdout;
        if (path) {
          // Rscript is installed
          installationDir = path.replace("\n", "");
        }
      } else {
        path = join(path, "Rscript");
        if (existsSync(path)) {
          //file Rscript exists
          installationDir = path;
        }
      }

      break;
    default:
      break;
  }

  return installationDir;
}

/**
 * Execute in R a specific one line command
 *
 * @param {string} command the single line R command
 * @param {string} RBinariesLocation optional parameter to specify an
 * alternative location for the Rscript binary
 * @returns {String[]} an array containing all the results from the command
 * execution output, 0 if there was an error
 */
export function executeRCommand(command: string, RBinariesLocation: string): string[] {
  let RscriptBinaryPath = isRscriptInstallaed(RBinariesLocation);
  let output: string | string[];

  if (RscriptBinaryPath) {
    var args = ["-e", command];
    var commandResult = executeShellCommand(RscriptBinaryPath, args);

    if (commandResult.stdout) {
      output = commandResult.stdout;
      output = filterMultiline(output);
    } else {
      throw Error(`[R: compile error] ${commandResult.stderr}`);
    }
  } else {
    throw Error("R not found, maybe not installed.\nSee www.r-project.org");
  }

  return output;
}

/**
 * Execute in R a specific one line command - asynchronously
 *
 * @param {string} command the single line R command
 * @param {string} RBinariesLocation optional parameter to specify an
 * alternative location for the Rscript binary
 * @returns {Promise<string>} an array containing all the results from the command
 * execution output, null if there was an error
 */
export async function executeRCommandAsync(
  command: string,
  RBinariesLocation: string
): Promise<string> {
  return new Promise(function (resolve, reject) {
    let RscriptBinaryPath = isRscriptInstallaed(RBinariesLocation);

    if (RscriptBinaryPath) {
      var args = ["-e", command];
      executeShellCommandAsync(RscriptBinaryPath, args)
        .then((output: any) => {
          output = filterMultiline(output);
          resolve(output);
        })
        .catch((stderr) => {
          reject(`[R: compile error] ${stderr}`);
        });
    } else {
      reject("R not found, maybe not installed.\nSee www.r-project.org");
    }
  });
}

/**
 * Execute in R all the commands in the file specified by the parameter
 * fileLocation.
 *
 * NOTE: the function reads only variables printed to stdout by the cat() or
 * print() function. It is recommended to use the print() function insted of the
 * cat() to avoid line break problem. If you use the cat() function remember to
 * add the newline character "\n" at the end of each cat: for example cat(" ...
 * \n")
 *
 * @param {string} fileLocation where the file to execute is stored
 * @param {string} RBinariesLocation optional parameter to specify an
 * alternative location for the Rscript binary
 * @returns {String[]} an array containing all the results from the command
 * execution output, 0 if there was an error
 */
export function executeRScript(
  fileLocation: string,
  RBinariesLocation?: string
): string[] {
  let RscriptBinaryPath = isRscriptInstallaed(RBinariesLocation);
  let output: string | string[];

  if (!existsSync(fileLocation)) {
    //file doesn't exist
    throw Error(`ERROR: the file "${fileLocation}" doesn't exist`);
  }

  if (RscriptBinaryPath) {
    var commandResult = executeShellCommand(RscriptBinaryPath, [fileLocation]);

    if (commandResult.stdout) {
      output = commandResult.stdout;
      output = filterMultiline(output);
    } else {
      throw Error(`[R: compile error] ${commandResult.stderr}`);
    }
  } else {
    throw Error("R not found, maybe not installed.\nSee www.r-project.org");
  }

  return output;
}

/**
 * Formats the parameters so that R could read them
 *
 * @param {Object} params an array of parameters
 * @returns {string} the parameters formatted in the proper way
 */
function convertParamsArray(params: Object): string {
  var methodSyntax = ``;

  if (Array.isArray(params)) {
    methodSyntax += "c(";

    for (let i = 0; i < params.length; i++) {
      methodSyntax += convertParamsArray(params[i]);
    }

    methodSyntax = methodSyntax.slice(0, -1);
    methodSyntax += "),";
  } else if (typeof params == "string") {
    methodSyntax += `'${params}',`;
  } else if (params == undefined) {
    methodSyntax += `NA,`;
  } else {
    methodSyntax += `${params},`;
  }

  return methodSyntax;
}

/**
 * Calls a R function located in an external script with parameters and returns
 * the result
 *
 * @param {string} fileLocation where the file containing the function is stored
 * @param {string} methodName the name of the method to execute
 * @param {Object} params an object containing a binding between parameter names
 * and value to pass to the function or an array
 * @param {string} RBinariesLocation optional parameter to specify an
 * alternative location for the Rscript binary
 * @returns {string} the execution output of the function, 0 in case of error
 */
export function callMethod(
  fileLocation: string,
  methodName: string,
  params: Object,
  RBinariesLocation: string
): string | string[] | false {
  let output: string | string[] | false = false;

  if (!methodName || !fileLocation || !params) {
    throw Error(
      "ERROR: please provide valid parameters - methodName, fileLocation and params cannot be null"
    );
  }

  var methodSyntax = `${methodName}(`;

  // check if params is an array of parameters or an object
  if (Array.isArray(params)) {
    methodSyntax += convertParamsArray(params);
  } else {
    for (const [key, value] of Object.entries(params)) {
      if (Array.isArray(value)) {
        methodSyntax += `${key}=${convertParamsArray(value)}`;
      } else if (typeof value == "string") {
        methodSyntax += `${key}='${value}',`; // string preserve quotes
      } else if (value == undefined) {
        methodSyntax += `${key}=NA,`;
      } else {
        methodSyntax += `${key}=${value},`;
      }
    }
  }

  var methodSyntax = methodSyntax.slice(0, -1);
  methodSyntax += ")";

  output = executeRCommand(
    `source('${fileLocation}') ; print(${methodSyntax})`,
    RBinariesLocation
  );

  return output;
}

/**
 * Calls a R function with parameters and returns the result - async
 *
 * @param {string} fileLocation where the file containing the function is stored
 * @param {string} methodName the name of the method to execute
 * @param {String []} params a list of parameters to pass to the function
 * @param {string} RBinariesLocation optional parameter to specify an
 * alternative location for the Rscript binary
 * @returns {Promise<string>} the execution output of the function
 */
export async function callMethodAsync(
  fileLocation: string,
  methodName: string,
  params: string[],
  RBinariesLocation: string
): Promise<string> {
  return new Promise(function (resolve, reject) {
    if (!methodName || !fileLocation || !params) {
      throw Error(
        "ERROR: please provide valid parameters - methodName, fileLocation and params cannot be null"
      );
    }

    var methodSyntax = `${methodName}(`;

    // check if params is an array of parameters or an object
    if (Array.isArray(params)) {
      methodSyntax += convertParamsArray(params);
    } else {
      for (const [key, value] of Object.entries(params)) {
        if (Array.isArray(value)) {
          methodSyntax += `${key}=${convertParamsArray(value)}`;
        } else if (typeof value == "string") {
          methodSyntax += `${key}='${value}',`; // string preserve quotes
        } else if (value == undefined) {
          methodSyntax += `${key}=NA,`;
        } else {
          methodSyntax += `${key}=${value},`;
        }
      }
    }

    var methodSyntax = methodSyntax.slice(0, -1);
    methodSyntax += ")";

    executeRCommandAsync(
      `source('${fileLocation}') ; print(${methodSyntax})`,
      RBinariesLocation
    )
      .then((res) => {
        resolve(res);
      })
      .catch((error) => {
        reject(`${error}`);
      });
  });
}

/**
 * Calls a standard R function with parameters and returns the result
 *
 * @param {string} methodName the name of the method to execute
 * @param {Object} params an object containing a binding between parameter names
 * and value to pass to the function or an array
 * @param {string} RBinariesLocation optional parameter to specify an
 * alternative location for the Rscript binary
 * @returns {string} the execution output of the function, 0 in case of error
 */
export function callStandardMethod(
  methodName: string,
  params: Object,
  RBinariesLocation: string
): string | string[] | false {
  let output: string | string[] | false = false;

  if (!methodName || !params) {
    throw Error(
      "ERROR: please provide valid parameters - methodName and params cannot be null"
    );
  }

  var methodSyntax = `${methodName}(`;

  // check if params is an array of parameters or an object
  if (Array.isArray(params)) {
    methodSyntax += convertParamsArray(params);
  } else {
    for (const [key, value] of Object.entries(params)) {
      if (Array.isArray(value)) {
        methodSyntax += `${key}=${convertParamsArray(value)}`;
      } else if (typeof value == "string") {
        methodSyntax += `${key}='${value}',`; // string preserve quotes
      } else if (value == undefined) {
        methodSyntax += `${key}=NA,`;
      } else {
        methodSyntax += `${key}=${value},`;
      }
    }
  }

  var methodSyntax = methodSyntax.slice(0, -1);
  methodSyntax += ")";

  output = executeRCommand(`print(${methodSyntax})`, RBinariesLocation);

  return output;
}

/**
 * Filters the multiline output from the executeRcommand and executeRScript
 * functions using regular expressions
 *
 * @param {string} commandResult the multiline result of RScript execution
 * @returns {String[]} an array containing all the results
 */
function filterMultiline(commandResult: string): string[] {
  let data: any[];

  // remove last newline to avoid empty results NOTE: windows newline is
  // composed by \r\n, GNU/Linux and Mac OS newline is \n
  var currentOS = getCurrentOs();

  commandResult = commandResult.replace(/\[\d+\] /g, "");

  if (currentOS == "win") {
    commandResult = commandResult.replace(/\t*\s*[\r\n]*$/g, "");
    commandResult = commandResult.replace(/[\s\t]+/g, "\r\n");
  } else {
    commandResult = commandResult.replace(/\t*\s*\n*$/g, "");
    commandResult = commandResult.replace(/[\s\t]+/g, "\n");
  }

  // check if data is JSON parsable
  try {
    data = [JSON.parse(commandResult)];
  } catch (e) {
    // the result is not json parsable -> split
    if (currentOS == "win") {
      data = commandResult.split(/[\r\n]+/);
    } else {
      data = commandResult.split(/[\n]+/);
    }

    // find undefined or NaN and remove quotes
    for (let i = 0; i < data.length; i++) {
      if (data[i] == "NA") {
        data[i] = undefined;
      } else if (data[i] == "NaN") {
        data[i] = NaN;
      } else {
        data[i] = data[i].replace(/\"/g, "");
      }
    }
  }

  return data;
}

export async function executeRRawScript(rawScript: string, injects: any = {}){
  let rawTemp = new RRawScript(rawScript)
  
  if(injects){
    for (const chave in injects) {
      rawTemp.addParam(chave, injects[chave])
    }
      
  }

    let results = []
    try {
      await executeRScript(rawTemp.execute());
      results = await rawTemp.readOutputData();
    } catch (e) {
      console.log(e)
    }

    rawTemp.deleteTemporaryFiles();

    return results
}

