var BURIEDTOWN_MANIFEST_PATH = "generated/manifest.json";

var getBuriedTownRequestedLocale = function () {
    var language = null;
    if (cc && cc.sys && cc.sys.localStorage) {
        language = cc.sys.localStorage.getItem("language");
    }
    if (!language && cc && cc.sys) {
        language = cc.sys.language;
    }
    return language || "zh";
};

var normalizeBuriedTownLocale = function (manifest, requestedLocale) {
    var locales = manifest && manifest.locales ? manifest.locales.slice() : ["zh", "en"];
    var locale = requestedLocale || "zh";
    if (locale === "zh-Hant") {
        locale = "zh";
    }
    if (locales.indexOf(locale) !== -1) {
        return locale;
    }
    if (locale.indexOf("zh") === 0 && locales.indexOf("zh") !== -1) {
        return "zh";
    }
    if (locales.indexOf("en") !== -1) {
        return "en";
    }
    return locales[0] || "zh";
};

var loadBuriedTownManifestForWeb = function (cb) {
    cc.loader.loadJson(BURIEDTOWN_MANIFEST_PATH, function (err, manifest) {
        cb(err, manifest || null);
    });
};

var loadBuriedTownScriptListForWeb = function (fileList, cb) {
    if (!fileList || fileList.length === 0) {
        if (cb) {
            cb();
        }
        return;
    }
    cc.loader.loadJs(fileList, function (err) {
        if (cb) {
            cb(err || null);
        }
    });
};

var finalizeBuriedTownRuntime = function (manifest, locale) {
    if (typeof BuriedTownBootstrap === "undefined" || !BuriedTownBootstrap) {
        return;
    }
    if (typeof BuriedTownBootstrap.setManifest === "function") {
        BuriedTownBootstrap.setManifest(manifest);
    }
    if (typeof BuriedTownBootstrap.afterLegacyRuntimeLoaded === "function") {
        BuriedTownBootstrap.afterLegacyRuntimeLoaded(locale);
    }
};

var loadBuriedTownRuntimeForWeb = function (manifest, cb) {
    var locale = normalizeBuriedTownLocale(manifest, getBuriedTownRequestedLocale());
    var bundles = [];
    if (manifest && manifest.bundles) {
        if (manifest.bundles.runtime) {
            bundles.push(manifest.bundles.runtime);
        }
        if (manifest.bundles.platform) {
            bundles.push(manifest.bundles.platform);
        }
        if (manifest.bundles.lang && manifest.bundles.lang[locale]) {
            bundles.push(manifest.bundles.lang[locale]);
        }
    }

    loadBuriedTownScriptListForWeb(bundles, function (bundleErr) {
        if (bundleErr) {
            if (cb) {
                cb(bundleErr);
            }
            return;
        }

        loadBuriedTownScriptListForWeb(manifest.legacyScripts || [], function (legacyErr) {
            if (!legacyErr) {
                finalizeBuriedTownRuntime(manifest, locale);
            }
            if (cb) {
                cb(legacyErr, locale);
            }
        });
    });
};

var beginGame = function () {
    if (cc.sys.isNative) {
        if (cc.sys.os == cc.sys.OS_IOS && typeof sdkbox !== "undefined" && sdkbox.PluginChartboost) {
            sdkbox.PluginChartboost.init();
        }
        var scene = new AssetsManagerLoaderScene();
        cc.director.runScene(scene);
        scene.loadGame();
        return;
    }

    loadBuriedTownManifestForWeb(function (manifestErr, manifest) {
        if (manifestErr || !manifest) {
            cc.error("Failed to load runtime manifest: " + manifestErr);
            return;
        }

        loadBuriedTownRuntimeForWeb(manifest, function (runtimeErr) {
            if (runtimeErr) {
                cc.error("Failed to load runtime scripts: " + runtimeErr);
                return;
            }

            var resources = [];
            resources.push("res/build.plist");
            resources.push("res/dig_build.plist");
            resources.push("res/dig_item.plist");
            resources.push("res/dig_monster.plist");
            resources.push("res/dig_work.plist");
            resources.push("res/end.plist");
            resources.push("res/gate.plist");
            resources.push("res/home.plist");
            resources.push("res/icon.plist");
            resources.push("res/map.plist");
            resources.push("res/menu.plist");
            resources.push("res/rank.plist");
            resources.push("res/site.plist");
            resources.push("res/ui.plist");
            resources.push("res/guide.plist");
            resources.push("res/medal.plist");
            cc.LoaderScene.preload(resources, function () {
                cc.director.runScene(new MenuScene());
            }, this);
        });
    });
};
