#!/usr/bin/env node
"use strict";

const fs = require("fs");
const { spawnSync } = require("child_process");

function runCommand(cmd, args) {
    const result = spawnSync(cmd, args, {
        stdio: "inherit",
        encoding: "utf8"
    });
    if (result.error) {
        console.error("Failed to run", cmd, args.join(" "));
        console.error(result.error.message || result.error);
        process.exit(1);
    }
    if (typeof result.status === "number" && result.status !== 0) {
        process.exit(result.status);
    }
}

function shouldSkip() {
    const skip = process.env.SKIP_PREPUSH || "";
    return skip === "1" || skip.toLowerCase() === "true";
}

function fileExists(file) {
    try {
        return fs.statSync(file).isFile();
    } catch (error) {
        return false;
    }
}

function main() {
    if (shouldSkip()) {
        console.log("SKIP_PREPUSH is set; skipping pre-push checks.");
        return;
    }

    runCommand("node", ["tools/validate-content.js", "all", "--lang", "zh"]);
    if (fileExists("assets/src/data/string/string_en.js")) {
        runCommand("node", ["tools/validate-content.js", "all", "--lang", "en"]);
    } else {
        console.log("Skipping en content validation: assets/src/data/string/string_en.js is missing.");
    }
    runCommand("node", ["tools/run-smoke.js", "runtime-boundaries", "startup"]);
}

main();
