const fs = require("fs");
const path = require("path");
const vm = require("vm");

const repoRoot = path.resolve(__dirname, "..", "..", "..");

function readRepoFile(relativePath) {
    return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

function loadIntoSandbox(sandbox, relativePath) {
    sandbox.module = { exports: {} };
    sandbox.exports = sandbox.module.exports;
    vm.runInContext(readRepoFile(relativePath), sandbox, { filename: relativePath });
    return sandbox.module.exports;
}

function runSmokeSuite(checks) {
    return checks.map(function (check) {
        return check();
    });
}

function runSmokeSuiteCli(options) {
    const successTitle = options.successTitle || "Smoke checks passed";
    const failureTitle = options.failureTitle || "Smoke checks failed";
    const checks = options.checks || [];

    try {
        const results = runSmokeSuite(checks);
        console.log(successTitle + ":");
        results.forEach(function (result) {
            console.log("- " + result.name + ": " + result.detail);
        });
        return results;
    } catch (error) {
        console.error(failureTitle + ":");
        console.error(error && error.stack ? error.stack : error);
        process.exitCode = 1;
        return null;
    }
}

module.exports = {
    assert: assert,
    loadIntoSandbox: loadIntoSandbox,
    readRepoFile: readRepoFile,
    repoRoot: repoRoot,
    runSmokeSuite: runSmokeSuite,
    runSmokeSuiteCli: runSmokeSuiteCli
};
