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

function parseSmokeArgs(argv) {
    argv = argv || [];
    const options = {
        grep: null,
        continueOnFail: false,
        suiteArgs: []
    };
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === "--grep" || arg === "-g") {
            options.grep = String(argv[++i] || "");
            continue;
        }
        if (arg.indexOf("--grep=") === 0) {
            options.grep = arg.slice("--grep=".length);
            continue;
        }
        if (arg === "--continue" || arg === "--continue-on-fail") {
            options.continueOnFail = true;
            continue;
        }
        options.suiteArgs.push(arg);
    }
    return options;
}

function filterChecks(checks, grep) {
    if (!grep) {
        return checks;
    }
    const needle = String(grep).toLowerCase();
    return checks.filter(function (check) {
        const name = typeof check === "function"
            ? (check.smokeName || check.name || "")
            : "";
        // 函数名 / 导出名 不够时，用临时 dry 不可行；按函数名+源串匹配
        const src = Function.prototype.toString.call(check);
        return name.toLowerCase().indexOf(needle) >= 0
            || src.toLowerCase().indexOf(needle) >= 0;
    });
}

function runSmokeSuite(checks, options) {
    options = options || {};
    const list = filterChecks(checks || [], options.grep);
    if ((checks || []).length && list.length === 0) {
        throw new Error("No smoke checks matched --grep=" + options.grep);
    }

    if (!options.continueOnFail) {
        return list.map(function (check) {
            return check();
        });
    }

    const results = [];
    const failures = [];
    list.forEach(function (check) {
        try {
            results.push(check());
        } catch (error) {
            failures.push({
                name: check.smokeName || check.name || "anonymous",
                error: error
            });
        }
    });
    return { results: results, failures: failures };
}

function runSmokeSuiteCli(options) {
    const successTitle = options.successTitle || "Smoke checks passed";
    const failureTitle = options.failureTitle || "Smoke checks failed";
    const checks = options.checks || [];
    const grep = options.grep || null;
    const continueOnFail = !!options.continueOnFail;

    try {
        const outcome = runSmokeSuite(checks, {
            grep: grep,
            continueOnFail: continueOnFail
        });

        if (continueOnFail) {
            const results = outcome.results || [];
            const failures = outcome.failures || [];
            if (results.length) {
                console.log(successTitle + " (" + results.length + "):");
                results.forEach(function (result) {
                    console.log("- " + result.name + ": " + result.detail);
                });
            }
            if (failures.length) {
                console.error(failureTitle + " (" + failures.length + "):");
                failures.forEach(function (f) {
                    console.error("- " + f.name + ": "
                        + (f.error && f.error.stack ? f.error.stack : f.error));
                });
                process.exitCode = 1;
                return null;
            }
            if (!results.length) {
                console.log(successTitle + ": (no checks)");
            }
            return results;
        }

        const results = outcome;
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
    parseSmokeArgs: parseSmokeArgs,
    filterChecks: filterChecks,
    runSmokeSuite: runSmokeSuite,
    runSmokeSuiteCli: runSmokeSuiteCli
};
