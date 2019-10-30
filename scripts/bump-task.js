const fs = require('fs');
const path = require('path');
const pathToTask = path.join(__dirname, '../src/task/task.json');
const taskJson = require(pathToTask);

let patch = parseInt(taskJson.version.Patch);

console.log('====== Bumping Task version ======')

console.log(`Current version: ${taskJson.version.Major}.${taskJson.version.Minor}.${taskJson.version.Patch}`);

patch++;

taskJson.version.Patch = patch.toString();

console.log(`New version: ${taskJson.version.Major}.${taskJson.version.Minor}.${taskJson.version.Patch}`);

fs.writeFileSync(pathToTask, `${JSON.stringify(taskJson, null, 4)}\n`, 'utf-8');

console.log(`File updated: "${pathToTask}"`);
