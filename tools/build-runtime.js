const fs = require("fs");
const path = require("path");
const vm = require("vm");
const esbuild = require("esbuild");
const ts = require("typescript");

const rootDir = path.resolve(__dirname, "..");
const assetsDir = path.join(rootDir, "assets");
const generatedDir = path.join(assetsDir, "generated");
const generatedLangDir = path.join(generatedDir, "lang");
const srcModDir = path.join(rootDir, "src-mod");
const jsListPath = path.join(assetsDir, "src", "jsList.js");
const stringDir = path.join(assetsDir, "src", "data", "string");
const bundleTarget = "es2017";
const safeGlobalExpression = "typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this))";
const legacyUnsafeSyntaxChecks = [
    {
        pattern: /=>/,
        description: "arrow function"
    },
    {
        pattern: /(^|[^\w$])const\s+[A-Za-z_$]/m,
        description: "const declaration"
    },
    {
        pattern: /(^|[^\w$])let\s+[A-Za-z_$]/m,
        description: "let declaration"
    },
    {
        pattern: /(^|[^\w$])class\s+[A-Za-z_$]/m,
        description: "class declaration"
    }
];

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

function readText(filePath) {
    return fs.readFileSync(filePath, "utf8");
}

function loadLegacyJsList() {
    const code = readText(jsListPath);
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
    const sourceText = readText(sourcePath);
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
        "})(" + safeGlobalExpression + ");",
        ""
    ].join("\n");
    fs.writeFileSync(outputPath, wrappedText, "utf8");
}

function transpileBundleToLegacy(outfile) {
    const sourceText = readText(outfile);
    const result = ts.transpileModule(sourceText, {
        fileName: path.basename(outfile),
        reportDiagnostics: true,
        compilerOptions: {
            allowJs: true,
            module: ts.ModuleKind.CommonJS,
            noEmit: false,
            target: ts.ScriptTarget.ES5
        }
    });

    if (result.diagnostics && result.diagnostics.length > 0) {
        const diagnosticsText = ts.formatDiagnosticsWithColorAndContext(result.diagnostics, {
            getCanonicalFileName: function (fileName) {
                return fileName;
            },
            getCurrentDirectory: function () {
                return rootDir;
            },
            getNewLine: function () {
                return "\n";
            }
        });
        throw new Error("Legacy transpile failed for " + path.relative(rootDir, outfile) + "\n" + diagnosticsText);
    }

    fs.writeFileSync(outfile, result.outputText, "utf8");
}

function validateLegacyBundle(filePath) {
    const sourceText = readText(filePath);
    if (!sourceText || sourceText.trim().length === 0) {
        throw new Error("Empty generated bundle: " + path.relative(rootDir, filePath));
    }
    legacyUnsafeSyntaxChecks.forEach(function (check) {
        if (check.pattern.test(sourceText)) {
            throw new Error("Legacy-incompatible syntax found in " + path.relative(rootDir, filePath) + ": " + check.description);
        }
    });
}

function validateLanguageBundle(filePath) {
    const sourceText = readText(filePath);
    if (sourceText.indexOf("})(typeof window !== 'undefined' ? window : globalThis);") !== -1) {
        throw new Error("Unsafe global fallback found in " + path.relative(rootDir, filePath));
    }
    if (sourceText.indexOf("typeof globalThis !== 'undefined' ? globalThis") === -1) {
        throw new Error("Safe global fallback missing in " + path.relative(rootDir, filePath));
    }
}

function validateGeneratedArtifacts(locales) {
    validateLegacyBundle(path.join(generatedDir, "runtime.bundle.js"));
    validateLegacyBundle(path.join(generatedDir, "platform.bundle.js"));
    locales.forEach(function (locale) {
        validateLanguageBundle(path.join(generatedLangDir, locale + ".bundle.js"));
    });
}

async function buildBundle(entryPoint, outfile, globalName) {
    await esbuild.build({
        entryPoints: [entryPoint],
        outfile: outfile,
        bundle: true,
        format: "iife",
        platform: "browser",
        target: bundleTarget,
        globalName: globalName,
        sourcemap: false,
        logLevel: "silent"
    });
    transpileBundleToLegacy(outfile);
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

    validateGeneratedArtifacts(locales);
}

main().catch(function (error) {
    console.error(error);
    process.exit(1);
});
