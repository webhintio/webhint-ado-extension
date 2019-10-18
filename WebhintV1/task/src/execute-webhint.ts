import * as fs from "fs";
import * as path from "path";
import * as juice from "juice";

import * as taskLibrary from "azure-pipelines-task-lib/task";
import { ToolRunner } from "azure-pipelines-task-lib/toolrunner";

export class WebhintTask {
  private static readonly BASE_REPORT_PATH = "webhintresult";

  private url: string;
  private workingDirectory: string;
  private htmlReportPath: string;
  private htmlReportInlinePath: string;
  private cliArgs: string[];

  private command: ToolRunner;

  public async run() {
    try {
      // setup environment
      this.defineWorkingDirectory();
      this.defineOutputReportPaths();

      // read inputs
      this.defineUrl();
      this.defineCliArgs();

      // setup command
      this.defineWebhintCommand();

      // execute webhint
      await this.executeWebhint();
    } catch (err) {
      // return as task failed
      taskLibrary.setResult(taskLibrary.TaskResult.Failed, err.message);
    } finally {
      // upload HTML results file as artifact
      if (fs.existsSync(this.htmlReportPath)) {
        await this.addWebhintHtmlAttachment();
        taskLibrary.setResult(taskLibrary.TaskResult.Succeeded, "Published results as artifact.");
      }
    }
  }

  private defineUrl() {
    this.url = taskLibrary.getInput("url", true);
  }

  private defineWorkingDirectory() {
    const sourceDirectory = taskLibrary.getVariable("build.sourceDirectory") || taskLibrary.getVariable("build.sourcesDirectory");
    this.workingDirectory = taskLibrary.getInput("cwd", false) || sourceDirectory;
    if (!this.workingDirectory) {
      throw new Error("Working directory is not defined");
    }
  }

  private defineOutputReportPaths() {
    this.htmlReportPath = path.join(this.workingDirectory,  WebhintTask.BASE_REPORT_PATH, `index.html`);
    this.htmlReportInlinePath = path.join(this.workingDirectory,  WebhintTask.BASE_REPORT_PATH, `inline.html`);
  }

  private defineCliArgs() {
    const argsStr = taskLibrary.getInput("args", false) || "";

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

    // create config file if a custom one is not provided
    if (args.filter(arg => arg.indexOf("-c=") == 0 || arg.indexOf("--config=") == 0).length == 0) {
      const rcFile = path.join(this.workingDirectory,  ".hintrc");

      // use web-recommended configuration
      fs.writeFileSync(rcFile, "{ \"extends\": [\"web-recommended\"] }");
    }

    args.push("--debug");
    args.push("--formatters=html");
    args.push("--tracking=off")
    args.push(`--output=${path.join(this.workingDirectory, WebhintTask.BASE_REPORT_PATH)}`);

    args.unshift(this.url);

    this.cliArgs = args;
  }

  private defineWebhintCommand() {
    let execPath: string;
    const args = this.cliArgs;

    execPath = this.getGlobalWebhintExecPath();
    if (execPath) {
      this.command = taskLibrary.tool(execPath);
      this.command.arg(args);
      return;
    }

    throw new Error('npm package "hint" is not installed globally or locally');
  }

  private getGlobalWebhintExecPath(): string {
    const execPath = taskLibrary.which("hint", false);
    return fs.existsSync(execPath) ? execPath : "";
  }

  private async executeWebhint() {
    const options = {
      ignoreReturnCode: true,
      failOnStdErr: false
    };
    const retCode = await this.command.exec(<any>options);

    if (!fs.existsSync(this.htmlReportPath)) {
      throw new Error(`Webhint did not generate an HTML report. Error code: ${retCode}`);
    }
  }

  private addWebhintHtmlAttachment() : Promise<void> {
    return new Promise((resolve, reject) => {
      const properties = {
        name: "webhintresult",
        type: "webhint_html_result",
      };

      // inline styles using juice
      juice.juiceFile(this.htmlReportPath, {}, (err, html) => {
        if(err) {
          reject(err);
        } else {
          fs.writeFileSync(this.htmlReportInlinePath, html);
          taskLibrary.command("task.addattachment", properties, this.htmlReportInlinePath);
          resolve();
        }
      });
    });
  }
}

new WebhintTask().run();
