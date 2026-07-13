#!/usr/bin/env node
"use strict";

const path = require("path");
const {
    parseSmokeArgs
} = require("./smoke/lib/core");

const SUITES = {
    startup: "startup",
    "runtime-boundaries": "runtime-boundaries"
};

function printHelp() {
    console.log("Usage: node tools/run-smoke.js [suite...] [options]");
    console.log("");
    console.log("Suites:");
    Object.keys(SUITES).forEach(function (suiteName) {
        console.log("  " + suiteName);
    });
    console.log("");
    console.log("Options:");
    console.log("  --grep <text> / -g <text>   only run checks whose source/name contains text");
    console.log("  --continue                  keep running after a failure; summarize at end");
    console.log("");
    console.log("Examples:");
    console.log("  node tools/run-smoke.js startup runtime-boundaries");
    console.log("  node tools/run-smoke.js runtime-boundaries --grep npc-economy");
    console.log("  node tools/run-smoke.js runtime-boundaries -g purchase --continue");
}

function normalizeSuiteNames(argv) {
    if (!argv.length) {
        return Object.keys(SUITES);
    }

    return argv.map(function (suiteName) {
        const normalized = SUITES[suiteName];
        if (!normalized) {
            throw new Error("Unknown smoke suite: " + suiteName);
        }
        return normalized;
    });
}

function runSuite(suiteName, options) {
    const modulePath = path.join(__dirname, "smoke", suiteName);
    const suite = require(modulePath);
    if (!suite || typeof suite.runCli !== "function") {
        throw new Error("Smoke suite is missing runCli(): " + suiteName);
    }
    return suite.runCli(options || {});
}

function main() {
    const rawArgv = process.argv.slice(2);
    if (rawArgv.indexOf("--help") !== -1 || rawArgv.indexOf("-h") !== -1) {
        printHelp();
        return;
    }

    const parsed = parseSmokeArgs(rawArgv);
    let suiteNames;
    try {
        suiteNames = normalizeSuiteNames(parsed.suiteArgs);
    } catch (error) {
        console.error(error.message || error);
        console.error("");
        printHelp();
        process.exit(1);
    }

    const cliOptions = {
        grep: parsed.grep,
        continueOnFail: parsed.continueOnFail
    };

    let failed = false;
    suiteNames.forEach(function (suiteName) {
        const result = runSuite(suiteName, cliOptions);
        if (!result) {
            failed = true;
        }
    });

    if (failed) {
        process.exitCode = 1;
    }
}

main();
