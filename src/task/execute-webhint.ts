import { exists } from "fs";
import { join } from "path";
import { promisify } from "util";

// import { juiceFile as juiceFileCb } from "juice";

import { getInput, getVariable, setResult, TaskResult, tool, which } from "azure-pipelines-task-lib/task";
import { ToolRunner } from "azure-pipelines-task-lib/toolrunner";

const existsAsync = promisify(exists);
// const juiceFile = promisify(juiceFileCb);

const BASE_REPORT_PATH = "webhintresult";

type ReportPaths = {
    source: string;
    destination: string;
}

/** Returns the URL to analyze provided by the user. */
const getUrl = (): string => {
    const url = getInput("url", true);

    if (!url) {
        throw new Error("URL to analyze is not defined");
    }

    return url;
};

/** Returns the user provided working directory or the source directory if none defined. */
const defineWorkingDirectory = () => {
    const sourceDirectory = getVariable("build.sourceDirectory") || getVariable("build.sourcesDirectory");
    const workingDirectory = process.cwd() || sourceDirectory;

    if (!workingDirectory) {
        throw new Error("Working directory is not defined");
    }

    return workingDirectory;
};

/** Returns the paths to the generated HTML report files. */
const defineOutputReportPaths = (workingDirectory: string): ReportPaths => {
    const source = join(workingDirectory, BASE_REPORT_PATH, `index.html`);
    const destination = join(workingDirectory, BASE_REPORT_PATH, `inline.html`);

    return { source, destination };
};

/**
 * Returns the arguments to use by webhint in the cli and creates
 * a temporary `.hintrc` file if needed.
 */
const defineCliArgs = (workingDirectory: string, url: string) => {
    const argsStr = getInput("args", false) || "";

    const illegalArgs = [
        "--output=",
        "--formatters",
        "--tracking"
    ];

    const args = argsStr
        .split(/\r?\n/)
        .map((arg) => arg.trim())
        .filter((arg) => arg.length > 0)
        .filter((arg) => !illegalArgs.some((illegalArg) => arg.startsWith(illegalArg)));

    if ((getVariable("system.debug") || '').toLowerCase() === "true") {
        args.push("--debug");
    }

    args.push("--formatters=html");
    args.push("--tracking=off")
    args.push(`--output=${join(workingDirectory, BASE_REPORT_PATH)}`);

    args.unshift(url);

    return args;
};

const executeWebhint = async (workingDirectory: string, url: string) => {
    const platform = process.platform;
    const hintExecutable = platform === "win32" ?
        'hint.cmd' :
        'hint';
    const localPath = join(process.cwd(), 'node_modules', '.bin', hintExecutable);
    const installedLocally = await existsAsync(localPath);
    const args = defineCliArgs(workingDirectory, url)

    let cmd: ToolRunner;

    if (installedLocally) {
        console.log(`Hint installed locally in: "${localPath}"`);

        cmd = tool(localPath);
    } else {
        // We run `hint` via npx because global installs cause problems
        const npmPath = which("npx", true);

        cmd = tool(npmPath);

        /**
         * The invocation is `npx hint URL --parameters`
         * Only `URL --parameters` is available prior here.
         */
        args.unshift("hint");

        console.warn(`Using "npx hint". This can take a bit.`);
        console.warn(`For better performance please install hint locally: "npm install hint -save-dev"`);
    }

    cmd.arg(args);

    const retCode = await cmd.exec();

    return retCode;
};

// const addWebhintHtmlAttachment = async (reportPaths: ReportPaths) => {

//     const properties = {
//         name: "webhintresult",
//         type: "webhint_html_result",
//     };

//     // inline styles using juice
//     const html = await juiceFile(reportPaths.source, {});

//     await writeFileAsync(reportPaths.destination, html);
//     command("task.addattachment", properties, reportPaths.destination);
// };

const run = async () => {

    try {
        // setup environment
        const workingDirectory = defineWorkingDirectory();
        console.log(`WorkingDirectory: ${workingDirectory}`)

        const reportPaths = defineOutputReportPaths(workingDirectory);

        // read inputs
        const url = getUrl();
        console.log(`URL: ${url}`);

        // execute webhint
        const retCode = await executeWebhint(workingDirectory, url);

        if (!await existsAsync(reportPaths.source)) {
            throw new Error(`Webhint did not generate an HTML report. Error code: ${retCode}`);
        }

        // await addWebhintHtmlAttachment(reportPaths);

        // setResult(TaskResult.Succeeded, "Published results as artifact.");
    } catch (err) {
        // return as task failed
        setResult(TaskResult.Failed, err.message);
    }
};

run();
