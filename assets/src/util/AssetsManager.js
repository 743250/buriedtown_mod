var UPDATE_PATH = "update/";
var lanSupports = [];
var stringName = {
    "fr": "français",
    "zh": "简体中文",
    "ar": "عربي",
    "es": "El español",
    "ja": "日本語",
    "ko": "한국어",
    "pt": "Português",
    "ru": "русский",
    "tr": "Türk",
    "vi": "Vietnam",
    "de": "Deutsch",
    "en": "English",
    "zh-Hant": "繁體中文"
}
var readBuriedTownManifestFromSearchPaths = function (searchPaths) {
    for (var index = 0; index < searchPaths.length; index++) {
        var fullPath = searchPaths[index] + BURIEDTOWN_MANIFEST_PATH;
        if (!jsb.fileUtils.isFileExist(fullPath)) {
            continue;
        }
        var manifestText = jsb.fileUtils.getStringFromFile(fullPath);
        var manifest = SafetyHelper.safeJSONParse(manifestText, null, "AssetsManager.runtimeManifest");
        if (manifest) {
            return manifest;
        }
    }
    return null;
};
var requireBuriedTownScriptFromSearchPaths = function (searchPaths, relativePath) {
    for (var index = 0; index < searchPaths.length; index++) {
        var fullPath = searchPaths[index] + relativePath;
        var compiledPath = fullPath.replace(/\.js$/i, ".jsc");
        if (!jsb.fileUtils.isFileExist(fullPath) && !jsb.fileUtils.isFileExist(compiledPath)) {
            continue;
        }
        if (typeof __cleanScript === "function") {
            __cleanScript(fullPath);
        }
        require(fullPath);
        return true;
    }
    return false;
};
var syncBuriedTownSupportedLocales = function (manifest) {
    lanSupports.length = 0;
    var locales = manifest && manifest.locales ? manifest.locales : [];
    locales.forEach(function (locale) {
        if (locale === "zh") {
            lanSupports.push(cc.sys.LANGUAGE_CHINESE);
            return;
        }
        if (locale === "en") {
            lanSupports.push(cc.sys.LANGUAGE_ENGLISH);
            return;
        }
        lanSupports.push(locale);
    });
};
var AssetsManagerLoaderScene = cc.Scene.extend({
    run: function () {
        var self = this;

        var oldSearchPath = cc.sys.localStorage.getItem("assetSearchPath");
        cc.log("oldSearchPath: " + oldSearchPath);
        if (!oldSearchPath) {
            oldSearchPath = [];
        } else {
            oldSearchPath = SafetyHelper.safeJSONParse(oldSearchPath, [], "AssetsManager.oldSearchPath");
        }
        cc.log("old search path is " + JSON.stringify(oldSearchPath));
        jsb.fileUtils.setSearchPaths(oldSearchPath);

        var manifestPath = "res/project.manifest";
        var storagePath = (jsb.fileUtils ? jsb.fileUtils.getWritablePath() + UPDATE_PATH : UPDATE_PATH);
        cc.log("Storage path: " + storagePath);


        var currentVersion = "0.0.1";
        if (jsb.fileUtils.isFileExist(storagePath + "version.manifest")) {

            var versionManifest = SafetyHelper.safeJSONParse(jsb.fileUtils.getStringFromFile(storagePath + "version.manifest"), null, "AssetsManager.currentVersionManifest");

            if (versionManifest) {
                var groupVersions = versionManifest["groupVersions"];
                if (groupVersions) {
                    var versionIndexArray = Object.keys(groupVersions);
                    var tmpVersion = groupVersions[versionIndexArray[versionIndexArray.length - 1]];
                    if (tmpVersion) {
                        currentVersion = tmpVersion;
                    }
                }
            }
        }

        var layer = new cc.Layer();
        this.addChild(layer);

        var newVersionLabel = new cc.LabelTTF("最新版本:" + currentVersion, "", 20);
        newVersionLabel.setPosition(cc.winSize.width - 9, 40);
        newVersionLabel.setAnchorPoint(1, 0);
        layer.addChild(newVersionLabel, 0);

        var currentVersionLabel = new cc.LabelTTF("当前版本:" + currentVersion, "", 20)
        currentVersionLabel.setPosition(cc.winSize.width - 9, 10);
        currentVersionLabel.setAnchorPoint(1, 0);
        layer.addChild(currentVersionLabel, 0);

        var percentageLabel = new cc.LabelTTF("", "", 20)
        percentageLabel.setPosition(9, 10);
        percentageLabel.setAnchorPoint(0, 0);
        layer.addChild(percentageLabel, 0);


        jsb.fileUtils.setSearchPaths([""]);
        this.am = new jsb.AssetsManager(manifestPath, storagePath);
        this.am.retain();
        this.failTimes = 0;

        if (!this.am.getLocalManifest().isLoaded()) {
            cc.log("Fail to update assets, step skipped.");
            this.loadGame();
        } else {
            var listener = new jsb.EventListenerAssetsManager(this.am, function (event) {
                cc.log("eventCode " + event.getEventCode());
                switch (event.getEventCode()) {
                    case jsb.EventAssetsManager.ERROR_NO_LOCAL_MANIFEST:
                        cc.log("No local manifest file found, skip assets update.");
                        self.loadGame();
                        break;
                    case jsb.EventAssetsManager.UPDATE_PROGRESSION:

                        cc.log("event.getPercent():" + event.getPercent());
                        cc.log("event.getPercentByFile():" + event.getPercentByFile());

                        percentageLabel.setString(event.getPercent() + "%");

                        break;
                    case jsb.EventAssetsManager.ERROR_DOWNLOAD_MANIFEST:
                    case jsb.EventAssetsManager.ERROR_PARSE_MANIFEST:
                        cc.log("Fail to download manifest file, update skipped.");
                        self.loadGame();
                        break;
                    case jsb.EventAssetsManager.NEW_VERSION_FOUND:
                        cc.log("new version found !!");
                        var newVersion = "";
                        var versionManifest = SafetyHelper.safeJSONParse(jsb.fileUtils.getStringFromFile(storagePath + "version.manifest"), null, "AssetsManager.newVersionManifest");

                        cc.log(JSON.stringify(versionManifest))
                        if (versionManifest) {
                            var groupVersions = versionManifest["groupVersions"];
                            var versionIndexArray = Object.keys(groupVersions);
                            var tmpVersion = groupVersions[versionIndexArray[versionIndexArray.length - 1]];
                            if (tmpVersion) {
                                newVersion = tmpVersion;
                            }
                        }
                        newVersionLabel.setString("最新版本:" + newVersion);
                        break;
                    case jsb.EventAssetsManager.ALREADY_UP_TO_DATE:
                    case jsb.EventAssetsManager.UPDATE_FINISHED:
                        cc.log("Update finished. " + event.getMessage());
                        self.loadGame();
                        break;
                    case jsb.EventAssetsManager.UPDATE_FAILED:
                        cc.log("Update failed. " + event.getMessage());

                        self.failTimes++;
                        if (self.failTimes < 1) {
                            self.am.downloadFailedAssets();
                        } else {
                            cc.log("Reach maximum fail count, exit update process");
                            self.failTimes = 0;
                            self.loadGame();
                        }
                        break;
                    case jsb.EventAssetsManager.ERROR_UPDATING:
                        cc.log("Asset update error: " + event.getAssetId() + ", " + event.getMessage());
                        break;
                    case jsb.EventAssetsManager.ERROR_DECOMPRESS:
                        cc.log(event.getMessage());
                        break;
                    default:
                        break;
                }
            });

            cc.eventManager.addListener(listener, 1);

            this.am.update();
        }

    },
    loadGame: function () {
        cc.director.getScheduler().scheduleCallbackForTarget(this, function () {
            var storagePaths = jsb.fileUtils.getSearchPaths();
            var manifest = readBuriedTownManifestFromSearchPaths(storagePaths);
            if (!manifest) {
                cc.error("Failed to load runtime manifest from search paths.");
                return;
            }

            syncBuriedTownSupportedLocales(manifest);
            var locale = normalizeBuriedTownLocale(manifest, getBuriedTownRequestedLocale());
            if (cc.sys && cc.sys.localStorage) {
                cc.sys.localStorage.setItem("language", locale);
            }

            var bundleList = [];
            if (manifest.bundles && manifest.bundles.runtime) {
                bundleList.push(manifest.bundles.runtime);
            }
            if (manifest.bundles && manifest.bundles.platform) {
                bundleList.push(manifest.bundles.platform);
            }
            if (manifest.bundles && manifest.bundles.lang && manifest.bundles.lang[locale]) {
                bundleList.push(manifest.bundles.lang[locale]);
            }

            bundleList.forEach(function (bundlePath) {
                requireBuriedTownScriptFromSearchPaths(storagePaths, bundlePath);
            });
            (manifest.legacyScripts || []).forEach(function (scriptPath) {
                requireBuriedTownScriptFromSearchPaths(storagePaths, scriptPath);
            });

            if (typeof BuriedTownBootstrap !== "undefined" && BuriedTownBootstrap) {
                if (typeof BuriedTownBootstrap.setManifest === "function") {
                    BuriedTownBootstrap.setManifest(manifest);
                }
                if (typeof BuriedTownBootstrap.afterLegacyRuntimeLoaded === "function") {
                    BuriedTownBootstrap.afterLegacyRuntimeLoaded(locale);
                }
            }

            var persistedSearchPaths = jsb.fileUtils.getSearchPaths().slice();
            if (persistedSearchPaths.length > 0) {
                persistedSearchPaths.pop();
            }
            cc.sys.localStorage.setItem("assetSearchPath", JSON.stringify(persistedSearchPaths));

            if (cc.sys.os == cc.sys.OS_ANDROID) {
                cc.director.runScene(new SplashScene());
            } else {
                cc.director.runScene(new MenuScene());
            }
        }, 1, 0);
    },

    getLocaleLanguage: function () {
        if (cc.sys.isNative) {
            if (cc.sys.os == cc.sys.OS_IOS) {
                var lan = jsb.reflection.callStaticMethod("CommonUtil", "getLocaleLanguage");
                cc.log("now language is " + lan);
                if (jsb.reflection.callStaticMethod("CommonUtil", "getOSVersion") >= 9) {
                    if (lan.indexOf("-") != -1) {
                        var lanArray = lan.split("-");
                        lanArray.pop();
                        lan = lanArray.join("-");
                    }
                }
                cc.log("now language is " + lan);
                return lan;
            } else if (cc.sys.os == cc.sys.OS_ANDROID) {
                return jsb.reflection.callStaticMethod("org/cocos2dx/javascript/CommonUtil", "getLocaleLanguage", "()Ljava/lang/String;");
            }
        } else {
            return 'zh';
        }
    },

    onExit: function () {
        if (this.am) {
            this.am.release();
        }
        this._super();
    }
});
