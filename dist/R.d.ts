type OSType = "win" | "lin" | "mac";
/**
 * Get the current Operating System name
 *
 * @returns {OSType} the operating system short name
 */
export declare function getCurrentOs(): OSType;
/**
 * Execute in R a specific one line command
 *
 * @param {string} command the single line R command
 * @param {string} RBinariesLocation optional parameter to specify an
 * alternative location for the Rscript binary
 * @returns {String[]} an array containing all the results from the command
 * execution output, 0 if there was an error
 */
declare function executeRCommand(command: string, RBinariesLocation: string): string[];
/**
 * Execute in R a specific one line command - asynchronously
 *
 * @param {string} command the single line R command
 * @param {string} RBinariesLocation optional parameter to specify an
 * alternative location for the Rscript binary
 * @returns {Promise<string>} an array containing all the results from the command
 * execution output, null if there was an error
 */
declare function executeRCommandAsync(command: string, RBinariesLocation: string): Promise<string>;
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
declare function executeRScript(fileLocation: string, RBinariesLocation?: string): string[];
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
declare function callMethod(fileLocation: string, methodName: string, params: Object, RBinariesLocation: string): string | string[] | false;
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
declare function callMethodAsync(fileLocation: string, methodName: string, params: string[], RBinariesLocation: string): Promise<string>;
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
declare function callStandardMethod(methodName: string, params: Object, RBinariesLocation: string): string | string[] | false;
declare const _default: {
    executeRCommand: typeof executeRCommand;
    executeRCommandAsync: typeof executeRCommandAsync;
    executeRScript: typeof executeRScript;
    callMethod: typeof callMethod;
    callMethodAsync: typeof callMethodAsync;
    callStandardMethod: typeof callStandardMethod;
};
export default _default;
