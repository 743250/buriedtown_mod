const fs = require("fs");
const path = require("path");
const vm = require("vm");
const esbuild = require("esbuild");

const rootDir = path.resolve(__dirname, "..");
const assetsDir = path.join(rootDir, "assets");
const generatedDir = path.join(assetsDir, "generated");
const generatedLangDir = path.join(generatedDir, "lang");
const srcModDir = path.join(rootDir, "src-mod");
const jsListPath = path.join(assetsDir, "src", "jsList.js");
const stringDir = path.join(assetsDir, "src", "data", "string");

const excludedLegacyScripts = new Set([
    "src/util/EnvironmentConfig.js",
    "src/util/safetyHelper.js",
    "src/util/contentBlueprint.js",
    "src/util/configValidator.js",
    "src/util/resourceFallback.js",
    "src/data/string/string.js"
]);

function ensureDir(dirPath) {
    fs.mkdirSync(dirPath, { recursive: true });
}

function loadLegacyJsList() {
    const code = fs.readFileSync(jsListPath, "utf8");
    const context = {};
    vm.createContext(context);
    vm.runInContext(code, context, { filename: jsListPath });
    return Array.isArray(context.jsList) ? context.jsList.slice() : [];
}

function getLocales() {
    return fs.readdirSync(stringDir)
        .filter(function (fileName) {
            return /^string_[^.]+\.js$/i.test(fileName);
        })
        .map(function (fileName) {
            return fileName.replace(/^string_/i, "").replace(/\.js$/i, "");
        })
        .sort();
}

function writeLanguageBundle(locale) {
    const sourcePath = path.join(stringDir, "string_" + locale + ".js");
    const outputPath = path.join(generatedLangDir, locale + ".bundle.js");
    const sourceText = fs.readFileSync(sourcePath, "utf8");
    const wrappedText = [
        "(function (global) {",
        "    var BuriedTownBootstrap = global.BuriedTownBootstrap || (global.BuriedTownBootstrap = {});",
        sourceText,
        "    if (typeof string !== 'undefined') {",
        "        global.string = string;",
        "        if (typeof BuriedTownBootstrap.registerLanguageBundle === 'function') {",
        "            BuriedTownBootstrap.registerLanguageBundle(" + JSON.stringify(locale) + ", string);",
        "        }",
        "    }",
        "    global.__BURIEDTOWN_ACTIVE_LANG__ = " + JSON.stringify(locale) + ";",
        "})(typeof window !== 'undefined' ? window : globalThis);",
        ""
    ].join("\n");
    fs.writeFileSync(outputPath, wrappedText, "utf8");
}

async function buildBundle(entryPoint, outfile, globalName) {
    await esbuild.build({
        entryPoints: [entryPoint],
        outfile: outfile,
        bundle: true,
        format: "iife",
        platform: "browser",
        target: "es2017",
        globalName: globalName,
        sourcemap: false,
        logLevel: "silent"
    });
}

async function main() {
    ensureDir(generatedDir);
    ensureDir(generatedLangDir);

    const locales = getLocales();
    const legacyScripts = loadLegacyJsList().filter(function (scriptPath) {
        return !excludedLegacyScripts.has(scriptPath);
    });

    await buildBundle(
        path.join(srcModDir, "runtime", "runtime-entry.ts"),
        path.join(generatedDir, "runtime.bundle.js"),
        "BuriedTownRuntimeBundle"
    );
    await buildBundle(
        path.join(srcModDir, "runtime", "platform-entry.ts"),
        path.join(generatedDir, "platform.bundle.js"),
        "BuriedTownPlatformBundle"
    );

    locales.forEach(writeLanguageBundle);

    const langBundles = {};
    locales.forEach(function (locale) {
        langBundles[locale] = "generated/lang/" + locale + ".bundle.js";
    });

    const manifest = {
        version: 1,
        generatedAt: new Date().toISOString(),
        bundles: {
            runtime: "generated/runtime.bundle.js",
            platform: "generated/platform.bundle.js",
            lang: langBundles
        },
        locales: locales,
        legacyScripts: legacyScripts
    };

    fs.writeFileSync(
        path.join(generatedDir, "manifest.json"),
        JSON.stringify(manifest, null, 2) + "\n",
        "utf8"
    );
}

main().catch(function (error) {
    console.error(error);
    process.exit(1);
});
