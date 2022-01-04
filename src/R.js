const fs = require("fs");
const pt = require('path');
var child_process = require('child_process');


/**
 * get the current Operating System name
 * 
 * @returns {string} the operating system short name 
 *  - "win" -> for Windows based Systems
 *  - "lin" -> for GNU/Linux based Systems
 *  - "mac" -> for MacOS based Systems
 */
getCurrentOs = () => {
    var processPlatform = process.platform;
    var currentOs;

    if (processPlatform === "win32"){
        currentOs = "win";
    }else if(processPlatform === "linux" || processPlatform === "openbsd" || processPlatform === "freebsd"){
        currentOs = "lin";
    }else {
        currentOs = "mac"
    }   

    return currentOs;
}


/**
 * execute a command in the OS shell (used to execute R command)
 * 
 * @param {string} command the command to execute
 * @returns {{string, string}} the command execution result
 */
executeShellCommand = (command) => {
    let stdout;
    let stderr;

    try {
        stdout = child_process.execSync(command,  {stdio : 'pipe' }).toString();
        stdout = stdout.replace(/\"/g, '');
    }catch(error){
        stderr = error;
    }

    return {stdout, stderr};
}

/**
 * checks if Rscript(R) is installed od the system and returns
 * the path where the binary is installed
 * 
 * @param {string} path alternative path to use as binaries directory
 * @returns {string} the path where the Rscript binary is installed, -1 otherwise
 */
isRscriptInstallaed = (path) => {
    var installationDir = -1;

    switch(getCurrentOs()){
        case "win":
            if (!path){
                path = pt.join("C:\\Program Files\\R");
            }

            if (fs.existsSync(path)){
                // Rscript is installed, let's find the path (version problems)

                let dirContent = fs.readdirSync(path);
                if (dirContent.length != 0){
                    let lastVersion = dirContent[dirContent.length - 1];
                    installationDir = pt.join(path, lastVersion, "bin", "Rscript.exe");
                }
            }
            break;
        case "mac":
        case "lin":
            if (!path){
                // the command "which" is used to find the Rscript installation dir
                path = executeShellCommand("which Rscript").stdout;
                if (path){
                    // Rscript is installed
                    installationDir = path.replace("\n", "");
                }
            }else{
                path = pt.join(path, "Rscript");
                if (fs.existsSync(path)) {
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
 * @param {string} RBinariesLocation optional parameter to specify an alternative location for the Rscript binary
 * @returns {String[]} an array containing all the results from the command execution output, -1 if there was an error
 */
executeRCommand = (command, RBinariesLocation) => {

    let RscriptBinaryPath = isRscriptInstallaed(RBinariesLocation);
    let output = -1;

    if (RscriptBinaryPath){
        var commandToExecute = `"${RscriptBinaryPath}" -e "${command}"`;
        var commandResult = executeShellCommand(commandToExecute);

        if (commandResult.stdout){
            output = commandResult.stdout;
            output = filterMultiline(output);
        }else{
            console.error(`[R: compile error] ${commandResult.stderr}`);
        }

    }else{
        console.error("R not found, maybe not installed.\nSee www.r-project.org");
    }

    return output;
}

/**
 * Execute in R a specific one line command - async
 * 
 * @param {string} command the single line R command
 * @param {string} RBinariesLocation optional parameter to specify an alternative location for the Rscript binary
 * @returns {String[]} an array containing all the results from the command execution output, null if there was an error
 */
executeRCommandAsync = (command, RBinariesLocation) => {
    return new Promise(function(resolve, reject) {

        var result = executeRCommand(command, RBinariesLocation);
       
        if (result){
            resolve(result);
        }else{
            reject("ERROR: there was an error");
        }
    });
}

/**
 * execute in R all the commands in the file specified by the parameter fileLocation
 * NOTE: the function reads only variables printed to stdout by the cat() or print() function.
 * It is recommended to use the print() function insted of the cat() to avoid line break problem.
 * If you use the cat() function remember to add the newline character "\n" at the end of each cat:
 * for example cat(" ... \n")
 * 
 * @param {string} fileLocation where the file to execute is stored
 * @param {string} RBinariesLocation optional parameter to specify an alternative location for the Rscript binary
 * @returns {String[]} an array containing all the results from the command execution output, -1 if there was an error
 */
executeRScript = (fileLocation, RBinariesLocation) => {
   
    let RscriptBinaryPath = isRscriptInstallaed(RBinariesLocation);
    let output = -1;

    if (! fs.existsSync(fileLocation)) {
        //file doesn't exist
        console.error(`ERROR: the file "${fileLocation} doesn't exist"`);
        return output;     
    }

    if (RscriptBinaryPath){
        var commandToExecute = `"${RscriptBinaryPath}" "${fileLocation}"`;
        var commandResult = executeShellCommand(commandToExecute);

        if (commandResult.stdout){
            output = commandResult.stdout;
            output = filterMultiline(output);
        }else{
            console.error(`[R: compile error] ${commandResult.stderr}`);
        }

    }else{
        console.error("R not found, maybe not installed.\nSee www.r-project.org");
    }

    return output;

}

/**
 * Formats the parameters so R could read them
 */
convertParamsArray = (params) => {
    var methodSyntax = ``;  

    if (Array.isArray(params)){
        methodSyntax += "c(";

        params.forEach((element) => {
            methodSyntax += convertParamsArray(element) ;
        });
        methodSyntax = methodSyntax.slice(0,-1);
        methodSyntax += "),";
    }else if (typeof params == "string"){
        methodSyntax += `'${params}',`;
    }else {
        methodSyntax += `${params},`;
    }

    return methodSyntax;
}


/**
 * calls a R function with parameters and returns the result
 * 
 * @param {string} fileLocation where the file containing the function is stored
 * @param {string} methodName the name of the method to execute
 * @param {String []} params a list of parameters to pass to the function 
 * @param {string} RBinariesLocation optional parameter to specify an alternative location for the Rscript binary
 * @returns {string} the execution output of the function, -1 in case of error
 */
callMethod = (fileLocation, methodName, params, RBinariesLocation) => {
    let output = -1;

    if (!methodName || !fileLocation || !params){
        console.error("ERROR: please provide valid parameters - methodName, fileLocation and params cannot be null");
        return output;
    }

    var methodSyntax = `${methodName}(`;  

    // check if params is an array of parameters or an object
    if (Array.isArray(params)){
        params.forEach((element) => {
            methodSyntax += convertParamsArray(element);
        });
    }else{
        for (const [key, value] of Object.entries(params)) {
            if (Array.isArray(value)){
                methodSyntax += `${key}=${convertParamsArray(value)}`;
            }else if (typeof value == "string"){
                methodSyntax += `${key}='${value}',`;   // string preserve quotes
            }else{
                methodSyntax += `${key}=${value},`;
            }
        }
    }

    var methodSyntax = methodSyntax.slice(0,-1);
    methodSyntax += ")";

    output = executeRCommand(`source('${fileLocation}') ; print(${methodSyntax})`, RBinariesLocation);
    
    return output;
}

/**
 * calls a R function with parameters and returns the result - async
 * 
 * @param {string} fileLocation where the file containing the function is stored
 * @param {string} methodName the name of the method to execute
 * @param {String []} params a list of parameters to pass to the function
 * @param {string} RBinariesLocation optional parameter to specify an alternative location for the Rscript binary
 * @returns {string} the execution output of the function
 */
callMethodAsync = (fileLocation, methodName, params, RBinariesLocation) => {
    return new Promise(function(resolve, reject) {

        var result = callMethod(fileLocation, methodName, params, RBinariesLocation);

        if (result) {
            resolve(result);
        }else{
            reject("ERROR: there was an error");
        }
    })
}



/**
 * filters the multiline output from the executeRcommand and executeRScript functions
 * using regular expressions
 * 
 * @param {string} commandResult the multiline result of RScript execution
 * @returns {String[]} an array containing all the results 
 */
filterMultiline = (commandResult) => {
    let data;

    // remove last newline to avoid empty results
    // NOTE: windows newline is composed by \r\n, GNU/Linux and Mac OS newline is \n
    var currentOS = getCurrentOs();

    if (currentOS == "win"){
        commandResult = commandResult.replace(/\r\n$/g, "");
        data = commandResult.split("\r\n");
    }else{
        commandResult = commandResult.replace(/\n$/g, "");
        data = commandResult.split("\n");
    }

    data.forEach((element, index) => {
        data[index] = element.replace(/\[.\] /g, "");
    });

    return data;
}

module.exports = {
    executeRCommand,
    executeRCommandAsync,
    executeRScript,
    callMethod,
    callMethodAsync
}
