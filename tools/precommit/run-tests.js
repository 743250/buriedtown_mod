#!/usr/bin/env node
"use strict";

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

function getStagedFiles() {
    const result = spawnSync("git", ["diff", "--cached", "--name-only"], {
        encoding: "utf8"
    });
    if (result.error) {
        throw result.error;
    }
    if (typeof result.status === "number" && result.status !== 0) {
        throw new Error(result.stderr || "git diff --cached failed");
    }
    return (result.stdout || "")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
}

function shouldSkip() {
    const skip = process.env.SKIP_PRECOMMIT || "";
    return skip === "1" || skip.toLowerCase() === "true";
}

function shouldForceContent() {
    const forced = process.env.PRECOMMIT_CONTENT || "";
    return forced === "1" || forced.toLowerCase() === "true";
}

function matchesAnyPrefix(file, prefixes) {
    return prefixes.some((prefix) => file.startsWith(prefix));
}

function matchesAnyFile(file, files) {
    return files.has(file);
}

function main() {
    if (shouldSkip()) {
        console.log("SKIP_PRECOMMIT is set; skipping pre-commit checks.");
        return;
    }

    let stagedFiles = [];
    try {
        stagedFiles = getStagedFiles();
    } catch (error) {
        console.warn("Unable to detect staged files; running baseline checks only.");
    }

    runCommand("node", ["tools/run-smoke.js"]);

    const contentPrefixes = [
        "assets/src/data/"
    ];

    const contentFiles = new Set([
        "assets/res/icon.plist",
        "assets/res/dig_item.plist",
        "assets/src/plugin/purchaseList.js",
        "assets/src/game/medal.js",
        "assets/src/game/IAPPackage.js",
        "assets/src/game/WeaponCraftService.js",
        "assets/src/util/contentBlueprint.js",
        "assets/src/util/configValidator.js"
    ]);

    const shouldRunContent = shouldForceContent() || stagedFiles.some((file) => {
        return matchesAnyPrefix(file, contentPrefixes) || matchesAnyFile(file, contentFiles);
    });

    if (shouldRunContent) {
        runCommand("node", [
            "tools/validate-content.js",
            "all",
            "--lang",
            "zh",
            "--strict-text"
        ]);
    }
}

main();
