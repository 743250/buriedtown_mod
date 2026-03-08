const contentValidator = require("./lib/content-validator");
const itemUiValidator = require("./lib/validate-item-ui");

function printHelp() {
    console.log("Usage: node tools/validate-content.js [command] [options]");
    console.log("");
    console.log("Commands:");
    console.log("  all                    Run item-ui and ContentBlueprint link checks.");
    console.log("  item-ui                Validate item config text and sprite links.");
    console.log("  links [type|all]       Validate role/talent/item/site links.");
    console.log("  weapon-links           Validate weapon item links (1301xxx-1305xxx).");
    console.log("  site-links             Validate all site links.");
    console.log("  checklist <type> <id>  Print required/optional dependency status for one id.");
    console.log("");
    console.log("Options:");
    console.log("  --id 1001,1002         Restrict validation to ids.");
    console.log("  --lang zh|en|both      Language used for string-based checks. Default: both.");
    console.log("  --strict-text          Treat item-ui text warnings as errors.");
    console.log("  --json                 Print machine-readable JSON.");
}

function parseItemIds(rawValue) {
    if (!rawValue) {
        return [];
    }
    return rawValue.split(",").map(function (value) {
        return value.trim();
    }).filter(function (value) {
        return value.length > 0;
    });
}

function parseArgs(argv) {
    const parsed = {
        command: "all",
        strictText: false,
        json: false,
        lang: "both",
        itemIds: [],
        scope: "all",
        type: null,
        checklistId: null
    };

    for (let index = 0; index < argv.length; index++) {
        const arg = argv[index];
        if (arg === "--help" || arg === "-h") {
            parsed.help = true;
            return parsed;
        }
        if (arg === "--strict-text") {
            parsed.strictText = true;
            continue;
        }
        if (arg === "--json") {
            parsed.json = true;
            continue;
        }
        if (arg === "--lang") {
            index += 1;
            parsed.lang = argv[index] || "";
            continue;
        }
        if (arg === "--id") {
            index += 1;
            parsed.itemIds = parseItemIds(argv[index] || "");
            continue;
        }
        if (arg === "all" || arg === "item-ui" || arg === "links" || arg === "weapon-links" || arg === "site-links" || arg === "checklist") {
            parsed.command = arg;
            if (arg === "weapon-links") {
                parsed.type = "item";
                parsed.scope = "weapons";
            }
            if (arg === "site-links") {
                parsed.type = "site";
            }
            if (arg === "links") {
                const nextArg = argv[index + 1];
                if (nextArg && nextArg.indexOf("--") !== 0) {
                    parsed.type = nextArg;
                    index += 1;
                } else {
                    parsed.type = "all";
                }
            }
            if (arg === "checklist") {
                parsed.type = argv[index + 1] || null;
                index += 1;
                const nextArg = argv[index + 1];
                if (nextArg && nextArg.indexOf("--") !== 0) {
                    parsed.checklistId = nextArg;
                    index += 1;
                }
            }
            continue;
        }
        parsed.error = "Unknown argument: " + arg;
        return parsed;
    }

    if (parsed.command === "checklist" && parsed.itemIds.length > 0) {
        parsed.checklistId = parsed.itemIds[0];
    }

    if (!parsed.type && parsed.command === "all") {
        parsed.type = "all";
    }

    return parsed;
}

function runAll(parsed) {
    return [
        itemUiValidator.validate({
            strictText: parsed.strictText,
            itemIds: parsed.itemIds
        })
    ];
}

function printJson(results) {
    console.log(JSON.stringify({
        ok: results.every(function (result) {
            return result.ok;
        }),
        checks: results
    }, null, 2));
}

function printText(results) {
    let exitCode = 0;
    results.forEach(function (result, index) {
        if (index > 0) {
            console.log("");
        }
        const resultCode = itemUiValidator.printResult(result, console);
        if (resultCode !== 0) {
            exitCode = resultCode;
        }
    });
    return exitCode;
}

function validateAll(parsed) {
    return {
        itemUiResults: runAll(parsed),
        linkResults: contentValidator.validateLinks("all", {
            lang: parsed.lang,
            ids: parsed.itemIds
        })
    };
}

function printAllText(resultBundle) {
    const itemUiExitCode = printText(resultBundle.itemUiResults);
    const linksExitCode = contentValidator.printValidationResults(resultBundle.linkResults, console);
    return itemUiExitCode || linksExitCode;
}

function main() {
    const parsed = parseArgs(process.argv.slice(2));
    if (parsed.help) {
        printHelp();
        return;
    }
    if (parsed.error) {
        console.error(parsed.error);
        console.error("");
        printHelp();
        process.exit(1);
    }

    if (parsed.lang !== "zh" && parsed.lang !== "en" && parsed.lang !== "both") {
        console.error("Invalid --lang: " + parsed.lang);
        process.exit(1);
    }

    if (parsed.command === "item-ui") {
        const results = [itemUiValidator.validate({ strictText: parsed.strictText, itemIds: parsed.itemIds })];
        if (parsed.json) {
            printJson(results);
            process.exit(results.every(function (result) {
                return result.ok;
            }) ? 0 : 1);
        }
        process.exit(printText(results));
    }

    if (parsed.command === "links" || parsed.command === "weapon-links" || parsed.command === "site-links") {
        const results = contentValidator.validateLinks(parsed.type || "all", {
            ids: parsed.itemIds,
            lang: parsed.lang,
            scope: parsed.scope
        });

        if (parsed.json) {
            printJson(results);
            process.exit(results.every(function (result) {
                return result.ok;
            }) ? 0 : 1);
        }

        process.exit(contentValidator.printValidationResults(results, console));
    }

    if (parsed.command === "checklist") {
        if (!parsed.type || !parsed.checklistId) {
            console.error("checklist requires a type and one --id value");
            process.exit(1);
        }

        const results = contentValidator.getChecklist(parsed.type, parsed.checklistId, {
            lang: parsed.lang
        });

        if (parsed.json) {
            printJson(results);
            process.exit(results.every(function (result) {
                return result.ok && !result.error;
            }) ? 0 : 1);
        }

        process.exit(contentValidator.printChecklistResults(results, console));
    }

    const results = validateAll(parsed);

    if (parsed.json) {
        printJson([].concat(results.itemUiResults, results.linkResults));
        process.exit(results.itemUiResults.every(function (result) {
            return result.ok;
        }) && results.linkResults.every(function (result) {
            return result.ok;
        }) ? 0 : 1);
    }

    process.exit(printAllText(results));
}

main();
