#!/usr/bin/env node
"use strict";

const fs = require("fs");
const { spawnSync } = require("child_process");

const HIGH_RISK_FILES = new Set([
    "assets/src/jsList.js",
    "assets/src/game/game.js",
    "assets/src/game/GameRuntime.js",
    "assets/src/game/record.js",
    "assets/src/game/player.js",
    "assets/src/game/PlayerPersistenceService.js",
    "assets/src/game/role.js",
    "assets/src/game/site.js",
    "assets/src/game/TalentService.js",
    "assets/src/game/Build.js",
    "assets/src/game/IAPPackage.js",
    "assets/src/game/PurchaseService.js",
    "assets/src/util/uiTheme.js",
    "assets/src/ui/button.js",
    "assets/src/ui/PurchaseUiHelper.js",
    "assets/src/ui/ChooseScene.js",
    "assets/src/ui/MenuScene.js",
    "assets/src/ui/MedalSceneView.js",
    "assets/src/ui/RoleTalentUiHelper.js",
    "assets/src/ui/StoryScene.js",
    "assets/src/ui/buildNode.js",
    "assets/src/ui/deathNode.js",
    "assets/src/ui/home.js",
    "assets/src/ui/shopScene.js",
    "assets/src/ui/topFrame.js",
    "assets/src/ui/uiUtil.js",
    "assets/src/ui/dialog.js"
]);

const ITEM_UI_FILES = new Set([
    "assets/src/data/itemConfig.js",
    "assets/src/ui/uiUtil.js",
    "assets/src/ui/equipNode.js"
]);

const ITEM_UI_PREFIXES = [
    "assets/src/data/string/"
];

const BUILD_LINK_FILES = new Set([
    "assets/src/data/buildConfig.js"
]);

const BUILD_ACTION_LINK_FILES = new Set([
    "assets/src/data/buildActionConfig.js"
]);

const WEAPON_LINK_FILES = new Set([
    "assets/src/data/itemConfig.js",
    "assets/src/data/formulaConfig.js",
    "assets/src/game/Battle.js",
    "assets/src/game/BattleEquipmentSystem.js"
]);

const SITE_LINK_FILES = new Set([
    "assets/src/data/siteConfig.js",
    "assets/src/game/site.js"
]);

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

function normalizeFileList(files) {
    const uniqueMap = {};
    return files.filter(Boolean).map((file) => file.trim()).filter(Boolean).filter((file) => {
        if (uniqueMap[file]) {
            return false;
        }
        uniqueMap[file] = true;
        return true;
    });
}

function fileExists(file) {
    try {
        return fs.statSync(file).isFile();
    } catch (error) {
        return false;
    }
}

function hasAnyFile(files, exactFiles, prefixes) {
    return files.some((file) => {
        if (exactFiles && exactFiles.has(file)) {
            return true;
        }
        if (!prefixes || !prefixes.length) {
            return false;
        }
        return prefixes.some((prefix) => file.indexOf(prefix) === 0);
    });
}

function runSyntaxChecks(files) {
    files.filter((file) => /\.js$/i.test(file) && fileExists(file)).forEach((file) => {
        runCommand("node", ["--check", file]);
    });
}

function main() {
    if (shouldSkip()) {
        console.log("SKIP_PRECOMMIT is set; skipping pre-commit checks.");
        return;
    }

    const explicitFiles = normalizeFileList(process.argv.slice(2));
    let targetFiles = explicitFiles;
    if (!targetFiles.length) {
        try {
            targetFiles = normalizeFileList(getStagedFiles());
        } catch (error) {
            console.warn("Unable to detect staged files; pre-commit will only run baseline syntax checks.");
            targetFiles = [];
        }
    }

    runSyntaxChecks(targetFiles);

    if (hasAnyFile(targetFiles, HIGH_RISK_FILES)) {
        runCommand("node", ["tools/run-smoke.js", "runtime-boundaries", "startup"]);
    }

    const shouldRunItemUi = shouldForceContent() || hasAnyFile(targetFiles, ITEM_UI_FILES, ITEM_UI_PREFIXES);
    if (shouldRunItemUi) {
        runCommand("node", ["tools/validate-content.js", "item-ui", "--strict-text"]);
    }

    if (hasAnyFile(targetFiles, BUILD_LINK_FILES)) {
        runCommand("node", ["tools/validate-content.js", "links", "build", "--lang", "zh"]);
    }

    if (hasAnyFile(targetFiles, BUILD_ACTION_LINK_FILES)) {
        runCommand("node", ["tools/validate-content.js", "links", "build-action", "--lang", "zh"]);
    }

    if (hasAnyFile(targetFiles, WEAPON_LINK_FILES)) {
        runCommand("node", ["tools/validate-content.js", "weapon-links", "--lang", "zh"]);
    }

    if (hasAnyFile(targetFiles, SITE_LINK_FILES)) {
        runCommand("node", ["tools/validate-content.js", "site-links", "--lang", "zh"]);
    }
}

main();
