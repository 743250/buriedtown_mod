#!/usr/bin/env node
"use strict";

const path = require("path");

const SUITES = {
    startup: "startup",
    "runtime-boundaries": "runtime-boundaries"
};

function printHelp() {
    console.log("Usage: node tools/run-smoke.js [suite...]");
    console.log("");
    console.log("Suites:");
    Object.keys(SUITES).forEach(function (suiteName) {
        console.log("  " + suiteName);
    });
    console.log("");
    console.log("Examples:");
    console.log("  node tools/run-smoke.js startup runtime-boundaries");
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

function runSuite(suiteName) {
    const modulePath = path.join(__dirname, "smoke", suiteName);
    const suite = require(modulePath);
    if (!suite || typeof suite.runCli !== "function") {
        throw new Error("Smoke suite is missing runCli(): " + suiteName);
    }
    return suite.runCli();
}

function main() {
    const argv = process.argv.slice(2);
    if (argv.indexOf("--help") !== -1 || argv.indexOf("-h") !== -1) {
        printHelp();
        return;
    }

    let suiteNames;
    try {
        suiteNames = normalizeSuiteNames(argv);
    } catch (error) {
        console.error(error.message || error);
        console.error("");
        printHelp();
        process.exit(1);
    }

    let failed = false;
    suiteNames.forEach(function (suiteName) {
        const result = runSuite(suiteName);
        if (!result) {
            failed = true;
        }
    });

    if (failed) {
        process.exitCode = 1;
    }
}

main();
