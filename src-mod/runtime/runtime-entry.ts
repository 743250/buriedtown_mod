import { BootstrapPatches } from "../bootstrap/BootstrapPatches";
import { DebugFlags } from "../bootstrap/DebugFlags";
import { SaveGameV2 } from "../domain/save/SaveGameV2";
import { createAppContext } from "../app/AppContext";
import { AssetResolver } from "../ui/AssetResolver";
import { getGlobalScope } from "../shared/global";

const globalScope = getGlobalScope();
const assetResolver = new AssetResolver();

type ManifestShape = {
    version?: number;
    bundles?: {
        runtime?: string;
        platform?: string;
        lang?: Record<string, string>;
    };
    locales?: string[];
    legacyScripts?: string[];
};

function createSafetyHelper() {
    return {
        safeCall(fn: any, defaultValue: any, ...args: any[]) {
            if (typeof fn !== "function") {
                return defaultValue;
            }
            try {
                return fn.apply(null, args);
            } catch (error) {
                if (globalScope.cc && typeof globalScope.cc.error === "function") {
                    globalScope.cc.error("SafeCall failed: " + error);
                }
                return defaultValue;
            }
        },
        safeCallWithFallback(fn: any, defaultValue: any, ...args: any[]) {
            if (typeof fn !== "function") {
                return defaultValue;
            }
            try {
                const result = fn.apply(null, args);
                return result || defaultValue;
            } catch (error) {
                if (globalScope.cc && typeof globalScope.cc.error === "function") {
                    globalScope.cc.error("SafeCallWithFallback failed: " + error);
                }
                return defaultValue;
            }
        },
        isEmpty(value: any) {
            return value === undefined || value === null || value === "";
        },
        safeJSONParse(jsonText: string, defaultValue: any, context?: string) {
            if (this.isEmpty(jsonText)) {
                return defaultValue;
            }
            try {
                return JSON.parse(jsonText);
            } catch (error) {
                if (globalScope.cc && typeof globalScope.cc.error === "function") {
                    globalScope.cc.error("safeJSONParse failed" + (context ? " [" + context + "]" : "") + ": " + error);
                }
                return defaultValue;
            }
        },
        safeLoadSprite(spriteName: string, fallbackName?: string | null) {
            if (this.isEmpty(spriteName)) {
                return fallbackName ? this.safeLoadSprite(fallbackName, null) : null;
            }
            try {
                const controller = globalScope.autoSpriteFrameController;
                if (controller && typeof controller.getSpriteFromSpriteName === "function") {
                    const sprite = controller.getSpriteFromSpriteName(spriteName);
                    if (sprite) {
                        return sprite;
                    }
                }
                return fallbackName ? this.safeLoadSprite(fallbackName, null) : null;
            } catch (error) {
                if (globalScope.cc && typeof globalScope.cc.error === "function") {
                    globalScope.cc.error("safeLoadSprite failed: " + spriteName + ", " + error);
                }
                return fallbackName ? this.safeLoadSprite(fallbackName, null) : null;
            }
        }
    };
}

function createErrorHandler(safetyHelper: any) {
    return {
        logError(context: string, error: any, extraInfo?: any) {
            const message = error instanceof Error ? error.message : error;
            const logMessage = "[ERROR] " + context + ": " + message + (extraInfo !== undefined ? " | " + JSON.stringify(extraInfo) : "");
            if (globalScope.cc && typeof globalScope.cc.error === "function") {
                globalScope.cc.error(logMessage);
            }
        },
        safeExecute(fn: any, context: string, fallback: any, ...args: any[]) {
            return safetyHelper.safeCall(fn, fallback, ...args);
        }
    };
}

const bootstrap = globalScope.BuriedTownBootstrap || {};
let manifest: ManifestShape | null = null;

bootstrap.setManifest = function (nextManifest: ManifestShape) {
    manifest = nextManifest || null;
};

bootstrap.getManifest = function () {
    return manifest;
};

bootstrap.registerLanguageBundle = function (_locale: string, _stringMap: any) {
};

bootstrap.getSupportedLocales = function (): string[] {
    if (manifest && Array.isArray(manifest.locales) && manifest.locales.length > 0) {
        return manifest.locales.slice();
    }
    return ["zh", "en"];
};

bootstrap.resolveLocale = function (requestedLocale?: string): string {
    const supportedLocales = this.getSupportedLocales();
    let locale = requestedLocale;
    if (!locale && globalScope.cc && globalScope.cc.sys && globalScope.cc.sys.localStorage) {
        locale = globalScope.cc.sys.localStorage.getItem("language");
    }
    if (!locale && globalScope.cc && globalScope.cc.sys) {
        locale = globalScope.cc.sys.language;
    }
    locale = locale || "zh";
    if (locale === "zh-Hant") {
        locale = "zh";
    }
    if (supportedLocales.indexOf(locale) !== -1) {
        return locale;
    }
    if (locale.indexOf("zh") === 0 && supportedLocales.indexOf("zh") !== -1) {
        return "zh";
    }
    if (supportedLocales.indexOf("en") !== -1) {
        return "en";
    }
    return supportedLocales[0] || "zh";
};

bootstrap.loadLanguageBundle = function (requestedLocale: string, callback?: (locale: string) => void) {
    const resolvedLocale = this.resolveLocale(requestedLocale);
    const manifestRef = this.getManifest();
    const bundleMap = manifestRef && manifestRef.bundles ? manifestRef.bundles.lang || {} : {};
    const bundlePath = bundleMap[resolvedLocale];
    if (!bundlePath) {
        if (callback) {
            callback(resolvedLocale);
        }
        return;
    }

    if (globalScope.cc && globalScope.cc.sys && !globalScope.cc.sys.isNative) {
        globalScope.cc.loader.loadJs([bundlePath], function () {
            if (globalScope.cc && globalScope.cc.sys && globalScope.cc.sys.localStorage) {
                globalScope.cc.sys.localStorage.setItem("language", resolvedLocale);
            }
            if (callback) {
                callback(resolvedLocale);
            }
        });
        return;
    }

    const searchPaths = globalScope.jsb && globalScope.jsb.fileUtils
        ? globalScope.jsb.fileUtils.getSearchPaths()
        : [];
    for (let index = 0; index < searchPaths.length; index++) {
        const fullPath = searchPaths[index] + bundlePath;
        if (globalScope.jsb.fileUtils.isFileExist(fullPath) || globalScope.jsb.fileUtils.isFileExist(fullPath.replace(/\.js$/i, ".jsc"))) {
            if (typeof globalScope.__cleanScript === "function") {
                globalScope.__cleanScript(fullPath);
            }
            if (typeof globalScope.require === "function") {
                globalScope.require(fullPath);
            }
            if (globalScope.cc && globalScope.cc.sys && globalScope.cc.sys.localStorage) {
                globalScope.cc.sys.localStorage.setItem("language", resolvedLocale);
            }
            break;
        }
    }
    if (callback) {
        callback(resolvedLocale);
    }
};

function installLegacyGlobals() {
    BootstrapPatches.install();
    const safetyHelper = createSafetyHelper();
    globalScope.DebugFlags = DebugFlags;
    globalScope.EnvironmentConfig = DebugFlags.createLegacyEnvironmentConfig();
    globalScope.SafetyHelper = safetyHelper;
    globalScope.ErrorHandler = createErrorHandler(safetyHelper);
    globalScope.AssetResolver = assetResolver;
    globalScope.ResourceFallback = assetResolver.createLegacyFacade();
    globalScope.SaveGameV2Runtime = SaveGameV2;
}

bootstrap.afterLegacyRuntimeLoaded = function (requestedLocale?: string) {
    installLegacyGlobals();
    const resolvedLocale = this.resolveLocale(requestedLocale);
    const appContext = createAppContext(assetResolver, {
        locale: resolvedLocale,
        manifestVersion: manifest ? manifest.version || 0 : 0
    });
    globalScope.AppContext = appContext;
    globalScope.BuriedTownAppContext = appContext;
    this.appContext = appContext;
    return appContext;
};

bootstrap.getAppContext = function () {
    return this.appContext || null;
};

globalScope.BuriedTownBootstrap = bootstrap;
installLegacyGlobals();

