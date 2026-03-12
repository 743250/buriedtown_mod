/**
 * 安全辅助工具 - 提供防御性编程和错误处理的工具函数
 * 用于提升代码稳定性，防止常见的运行时错误
 */

var SafetyHelper = {
    _standaloneSpritePathCache: {},

    normalizeSpriteName: function(spriteName) {
        if (this.isEmpty(spriteName)) {
            return "";
        }
        return spriteName.charAt(0) === '#' ? spriteName.substr(1) : spriteName;
    },

    _pushUniqueValue: function(list, value) {
        if (!value || list.indexOf(value) !== -1) {
            return;
        }
        list.push(value);
    },

    _getStandaloneCandidateDirs: function(normalizedName) {
        var candidateDirs = [];
        if (this.isEmpty(normalizedName) || normalizedName.indexOf("/") !== -1) {
            return candidateDirs;
        }

        if (/^npc(_dig)?_/.test(normalizedName)) {
            this._pushUniqueValue(candidateDirs, "res/npc");
        }
        if (/^icon_/.test(normalizedName)) {
            this._pushUniqueValue(candidateDirs, "res/icon");
            this._pushUniqueValue(candidateDirs, "res/ui");
        }
        if (/^site_/.test(normalizedName)) {
            this._pushUniqueValue(candidateDirs, "res/site");
            this._pushUniqueValue(candidateDirs, "res/ui");
        }
        if (/^build(_action)?_/.test(normalizedName)) {
            this._pushUniqueValue(candidateDirs, "res/build");
        }
        if (/^dig_build_/.test(normalizedName)) {
            this._pushUniqueValue(candidateDirs, "res/dig_build");
        }
        if (/^dig_item_/.test(normalizedName)) {
            this._pushUniqueValue(candidateDirs, "res/dig_item");
        }
        if (/^monster_dig_/.test(normalizedName)) {
            this._pushUniqueValue(candidateDirs, "res/dig_monster");
        }
        if (/^work_dig_/.test(normalizedName)) {
            this._pushUniqueValue(candidateDirs, "res/dig_work");
        }
        if (/^gate_/.test(normalizedName)) {
            this._pushUniqueValue(candidateDirs, "res/gate");
        }
        if (/^home_/.test(normalizedName)) {
            this._pushUniqueValue(candidateDirs, "res/home");
        }
        if (/^map_/.test(normalizedName)) {
            this._pushUniqueValue(candidateDirs, "res/map");
        }
        if (/^menu_/.test(normalizedName)) {
            this._pushUniqueValue(candidateDirs, "res/menu");
        }
        if (/^rank_/.test(normalizedName)) {
            this._pushUniqueValue(candidateDirs, "res/rank");
        }
        if (/^weather_/.test(normalizedName)) {
            this._pushUniqueValue(candidateDirs, "res/weather");
        }
        if (/^day_scene_/.test(normalizedName)) {
            this._pushUniqueValue(candidateDirs, "res/day");
            this._pushUniqueValue(candidateDirs, "res/day2");
        }
        if (/^(btn_|frame_|dialog_|checkbox_|edit_|loading_anim_|page_view_indicator_|slider_)/.test(normalizedName)
            || /^(build_icon_bg|guide_bg|item_bg|item_equip_bg|pb|pb_bg|role_bg|site_dig_secret|dig_death|dig_start)\.png$/.test(normalizedName)) {
            this._pushUniqueValue(candidateDirs, "res/ui");
        }
        if (/^(btn_home|btn_share|end_bg)\.png$/.test(normalizedName)) {
            this._pushUniqueValue(candidateDirs, "res/end");
        }

        return candidateDirs;
    },

    resolveStandaloneSpritePaths: function(spriteName) {
        var normalizedName = this.normalizeSpriteName(spriteName);
        if (this.isEmpty(normalizedName)) {
            return [];
        }

        if (this._standaloneSpritePathCache[normalizedName]) {
            return this._standaloneSpritePathCache[normalizedName].slice();
        }

        var candidateDirs = this._getStandaloneCandidateDirs(normalizedName);
        var candidatePaths = candidateDirs.map(function(dir) {
            return dir + "/" + normalizedName;
        });

        if (typeof jsb !== "undefined"
            && jsb
            && jsb.fileUtils
            && typeof jsb.fileUtils.isFileExist === "function") {
            var existingPaths = candidatePaths.filter(function(path) {
                return jsb.fileUtils.isFileExist(path);
            });
            if (existingPaths.length > 0) {
                this._standaloneSpritePathCache[normalizedName] = existingPaths;
                return existingPaths.slice();
            }
        }

        this._standaloneSpritePathCache[normalizedName] = candidatePaths;
        return candidatePaths.slice();
    },

    resolveStandaloneSpritePath: function(spriteName) {
        var candidatePaths = this.resolveStandaloneSpritePaths(spriteName);
        return candidatePaths.length > 0 ? candidatePaths[0] : null;
    },

    loadStandaloneSprite: function(spriteName) {
        var candidatePaths = this.resolveStandaloneSpritePaths(spriteName);
        if (!candidatePaths || candidatePaths.length === 0) {
            return null;
        }

        for (var i = 0; i < candidatePaths.length; i++) {
            var spritePath = candidatePaths[i];
            try {
                var sprite = new cc.Sprite(spritePath);
                var size = sprite && typeof sprite.getContentSize === 'function' ? sprite.getContentSize() : null;
                if (sprite && size && (size.width > 0 || size.height > 0)) {
                    return sprite;
                }
            } catch (e) {
                cc.error("loadStandaloneSprite failed: " + spritePath + ", " + e);
            }
        }
        return null;
    },

    safeCall: function(fn, defaultValue) {
        if (typeof fn !== 'function') {
            return defaultValue;
        }
        try {
            var args = Array.prototype.slice.call(arguments, 2);
            return fn.apply(null, args);
        } catch (e) {
            cc.error("SafeCall failed: " + e);
            return defaultValue;
        }
    },

    safeCallWithFallback: function(fn, defaultValue) {
        if (typeof fn !== 'function') {
            return defaultValue;
        }
        try {
            var args = Array.prototype.slice.call(arguments, 2);
            var result = fn.apply(null, args);
            return result || defaultValue;
        } catch (e) {
            cc.error("SafeCallWithFallback failed: " + e);
            return defaultValue;
        }
    },

    preventDuplicate: function(context, flagName, fn) {
        return function() {
            if (context[flagName]) {
                return;
            }
            context[flagName] = true;
            try {
                return fn.apply(context, arguments);
            } finally {
                context[flagName] = false;
            }
        };
    },

    safeCreateUI: function(createFn, errorMsg) {
        try {
            return createFn();
        } catch (e) {
            cc.error((errorMsg || "UI creation failed") + ": " + e);
            return null;
        }
    },

    hasMethod: function(obj, methodName) {
        return obj && typeof obj[methodName] === 'function';
    },

    isEmpty: function(value) {
        return value === undefined || value === null || value === "";
    },

    safeJSONParse: function(jsonText, defaultValue, context) {
        if (this.isEmpty(jsonText)) {
            return defaultValue;
        }
        try {
            return JSON.parse(jsonText);
        } catch (e) {
            cc.error("safeJSONParse failed" + (context ? " [" + context + "]" : "") + ": " + e);
            return defaultValue;
        }
    },

    safeLoadSprite: function(spriteName, fallbackName) {
        if (this.isEmpty(spriteName)) {
            return fallbackName ? this.safeLoadSprite(fallbackName, null) : null;
        }
        try {
            var sprite = autoSpriteFrameController.getSpriteFromSpriteName(spriteName);
            if (sprite) {
                return sprite;
            }
            sprite = this.loadStandaloneSprite(spriteName);
            if (sprite) {
                return sprite;
            }
            return fallbackName ? this.safeLoadSprite(fallbackName, null) : null;
        } catch (e) {
            var standaloneSprite = this.loadStandaloneSprite(spriteName);
            if (standaloneSprite) {
                return standaloneSprite;
            }
            cc.error("safeLoadSprite failed: " + spriteName + ", " + e);
            return fallbackName ? this.safeLoadSprite(fallbackName, null) : null;
        }
    }
};

// ErrorHandler别名（向后兼容）
var ErrorHandler = {
    logError: function(context, error, extraInfo) {
        var errorMsg = error instanceof Error ? error.message : error;
        var logMsg = "[ERROR] " + context + ": " + errorMsg;
        if (extraInfo !== undefined) {
            logMsg += " | " + JSON.stringify(extraInfo);
        }
        cc.error(logMsg);
    },
    safeExecute: function(fn, context, fallback) {
        var args = Array.prototype.slice.call(arguments, 3);
        args.unshift(fn, fallback);
        return SafetyHelper.safeCall.apply(SafetyHelper, args);
    }
};
