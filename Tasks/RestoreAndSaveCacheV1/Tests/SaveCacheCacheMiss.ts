import * as tmrm from "azure-pipelines-task-lib/mock-run";
import * as path from "path";
import * as fs from "fs";
import {  TaskLibAnswers } from "azure-pipelines-task-lib/mock-answer";
import { UniversalMockHelper } from "packaging-common/Tests/UniversalMockHelper";

const taskPath = path.join(__dirname, "..", "savecache.js");
const tmr: tmrm.TaskMockRunner = new tmrm.TaskMockRunner(taskPath);
const hash = "a31fc58e7e95f16dca2f3fe4b096f7c0e6406086eaaea885536e9b418b2d533d";

tmr.setInput("keyFile", "**/*/yarn.lock");
tmr.setInput("targetFolder", "**/*/node_modules");

const key = `${process.platform}-${hash}`.toUpperCase();
process.env[key] = "false";
process.env["SYSTEM_DEFAULTWORKINGDIRECTORY"] = "DefaultWorkingDirectory";

// provide answers for task mock
const a: TaskLibAnswers = {
  findMatch: {
    "**/*/yarn.lock": ["src/webapi/yarn.lock", "src/application/yarn.lock"],
    "**/*/node_modules": ["src/webapi/node_modules", "src/application/node_modules"],
  },
  find: {
    DefaultWorkingDirectory: [
      "src/webapi/node_modules",
      "src/application/node_modules",
      "src/webapi/startup.config",
      "src/application/program.cs",
    ],
  },
  rmRF: {
    "*": { success: true },
  },
  stats: {
    "src/webapi/node_modules": {
      isDirectory() {return true; },
    },
    "src/application/node_modules": {
        isDirectory() {return true; },
    },
  },
  exist: {
      "DefaultWorkingDirectory/tmp_cache": true,
  },
};

tmr.setAnswers(a);

const umh: UniversalMockHelper = new UniversalMockHelper(tmr, a, "/users/tmp/ArtifactTool.exe");

umh.mockUniversalCommand(
  "publish",
  "node-package-feed",
  "builddefinition1",
  `1.0.0-${process.platform}-${hash}`,
  "/users/home/directory/tmp_cache",
  {
    code: 0,
    stdout: "ArtifactTool.exe output",
    stderr: "",
  }
);

// mock a specific module function called in task
tmr.registerMock("fs", {
    readFileSync(
      path: string,
      options:
        | string
        | {
            encoding: string;
            flag?: string;
          }
    ): string {
      if (path.endsWith("/yarn.lock")) {
        return path.toString();
      }
      return fs.readFileSync(path, options);
    },
    chmodSync: fs.chmodSync,
    writeFileSync: fs.writeFileSync,
    readdirSync: fs.readdirSync,
    mkdirSync: fs.mkdirSync,
    copyFileSync: fs.copyFileSync,
    statSync: fs.statSync,
    linkSync: fs.linkSync,
    symlinkSync: fs.symlinkSync,
});

tmr.registerMock("shelljs", {
    exec(command: string) {
      console.log(`Mock exec: ${command}`);
      return  {
        code: 0,
        stdout: "shelljs output",
        stderr: null,
      };
    },
});

tmr.run();