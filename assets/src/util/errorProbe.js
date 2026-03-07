/**
 * Global runtime error probe for debugging black-screen issues.
 * Persists recent events/exceptions to localStorage and native writable file.
 */
(function () {
    if (typeof cc === "undefined") {
        return;
    }
    if (typeof ErrorProbe !== "undefined" && ErrorProbe && ErrorProbe._installed) {
        return;
    }

    var MAX_RECORDS = 120;
    var STORAGE_KEY = "error_probe_records_v1";
    var LAST_ERROR_TEXT_KEY = "error_probe_last_error_text_v1";
    var LOG_FILENAME = "error_probe.log";

    var safeStringify = function (value) {
        try {
            return JSON.stringify(value);
        } catch (e) {
            return String(value);
        }
    };

    var parseRecords = function () {
        var text = "";
        try {
            text = cc.sys.localStorage.getItem(STORAGE_KEY) || "[]";
        } catch (e) {
            text = "[]";
        }
        try {
            var list = JSON.parse(text);
            return Array.isArray(list) ? list : [];
        } catch (e2) {
            return [];
        }
    };

    var persistRecords = function (records) {
        var serialized = safeStringify(records);
        try {
            cc.sys.localStorage.setItem(STORAGE_KEY, serialized);
        } catch (e) {
        }
        try {
            if (cc.sys.isNative && typeof jsb !== "undefined" && jsb && jsb.fileUtils) {
                var path = jsb.fileUtils.getWritablePath() + LOG_FILENAME;
                jsb.fileUtils.writeStringToFile(serialized, path);
            }
        } catch (e2) {
        }
    };

    var getSceneName = function () {
        try {
            var scene = cc.director && cc.director.getRunningScene && cc.director.getRunningScene();
            if (!scene) {
                return "<none>";
            }
            if (typeof scene.getName === "function" && scene.getName()) {
                return scene.getName();
            }
            if (scene.constructor && scene.constructor.name) {
                return scene.constructor.name;
            }
        } catch (e) {
        }
        return "<unknown>";
    };

    var pushRecord = function (level, message, detail) {
        var records = parseRecords();
        records.push({
            time: new Date().toISOString(),
            level: level,
            scene: getSceneName(),
            message: message || "",
            detail: detail || null
        });
        if (records.length > MAX_RECORDS) {
            records = records.slice(records.length - MAX_RECORDS);
        }
        persistRecords(records);
        try {
            cc.log("[ErrorProbe][" + level + "] " + message + (detail ? (" | " + safeStringify(detail)) : ""));
        } catch (e) {
        }

        if (level === "ERROR") {
            var summary = buildErrorSummary(message, detail);
            try {
                cc.sys.localStorage.setItem(LAST_ERROR_TEXT_KEY, summary);
            } catch (e2) {
            }
            try {
                cc.error("[ErrorProbe][AUTO]\n" + summary);
            } catch (e3) {
                cc.log("[ErrorProbe][AUTO]\n" + summary);
            }
            dumpRecentToConsole("auto-error", 12);
        }
    };

    var buildErrorSummary = function (message, detail) {
        var source = (detail && detail.source) ? String(detail.source) : "";
        var line = (detail && detail.lineno) ? detail.lineno : 0;
        var col = (detail && detail.colno) ? detail.colno : 0;
        var stack = (detail && detail.stack) ? String(detail.stack) : "";
        var stackLines = stack ? stack.split("\n").slice(0, 8).join("\n") : "<no stack>";
        var rows = [];
        rows.push("time: " + new Date().toISOString());
        rows.push("scene: " + getSceneName());
        rows.push("message: " + (message || ""));
        if (source) {
            rows.push("source: " + source + "@" + line + ":" + col);
        }
        rows.push("stack:\n" + stackLines);
        return rows.join("\n");
    };

    var dumpRecentToConsole = function (tag, count) {
        var list = parseRecords();
        var n = count || 10;
        var start = Math.max(0, list.length - n);
        var out = ["[ErrorProbe][DUMP][" + (tag || "manual") + "] total=" + list.length];
        for (var i = start; i < list.length; i++) {
            var r = list[i];
            out.push((i + 1) + ". " + r.time + " [" + r.level + "] " + r.scene + " :: " + r.message);
        }
        try {
            cc.log(out.join("\n"));
        } catch (e) {
        }
    };

    var probe = {
        _installed: false,
        mark: function (message, detail) {
            pushRecord("MARK", message, detail || null);
        },
        getRecords: function () {
            return parseRecords();
        },
        clear: function () {
            persistRecords([]);
            pushRecord("MARK", "probe records cleared");
        },
        printRecent: function (count) {
            dumpRecentToConsole("manual", count || 20);
        },
        getLastErrorText: function () {
            try {
                return cc.sys.localStorage.getItem(LAST_ERROR_TEXT_KEY) || "";
            } catch (e) {
                return "";
            }
        },
        printLastError: function () {
            var text = this.getLastErrorText();
            if (!text) {
                cc.log("[ErrorProbe] last error is empty");
                return;
            }
            try {
                cc.error("[ErrorProbe][LAST]\n" + text);
            } catch (e) {
                cc.log("[ErrorProbe][LAST]\n" + text);
            }
        },
        getNativeLogPath: function () {
            if (cc.sys.isNative && typeof jsb !== "undefined" && jsb && jsb.fileUtils) {
                return jsb.fileUtils.getWritablePath() + LOG_FILENAME;
            }
            return null;
        },
        install: function () {
            if (this._installed) {
                return;
            }
            this._installed = true;

            pushRecord("MARK", "ErrorProbe installed", {native: cc.sys.isNative});
            pushRecord("MARK", "ErrorProbe log path", {path: this.getNativeLogPath() || "<localStorage>"});
            dumpRecentToConsole("boot", 8);

            if (cc.director && cc.director.runScene) {
                var oldRunScene = cc.director.runScene;
                cc.director.runScene = function (scene) {
                    var sceneName = "<null>";
                    try {
                        sceneName = (scene && scene.constructor && scene.constructor.name) ? scene.constructor.name : "<anonymous_scene>";
                    } catch (e) {
                    }
                    pushRecord("MARK", "runScene", {scene: sceneName});
                    return oldRunScene.apply(this, arguments);
                };
            }

            if (cc.game && typeof cc.game.setFrameRate === "function") {
                pushRecord("MARK", "runtime ready", {frameRate: cc.game.config && cc.game.config.frameRate});
            }

            if (typeof window !== "undefined") {
                var oldOnError = window.onerror;
                window.onerror = function (message, source, lineno, colno, error) {
                    pushRecord("ERROR", String(message), {
                        source: source || "",
                        lineno: lineno || 0,
                        colno: colno || 0,
                        stack: error && error.stack ? String(error.stack) : ""
                    });
                    if (typeof oldOnError === "function") {
                        return oldOnError.apply(this, arguments);
                    }
                    return false;
                };

                if (typeof window.addEventListener === "function") {
                    window.addEventListener("unhandledrejection", function (evt) {
                        var reason = evt && evt.reason;
                        pushRecord("ERROR", "unhandledrejection", {
                            reason: reason && reason.message ? reason.message : String(reason),
                            stack: reason && reason.stack ? String(reason.stack) : ""
                        });
                    });
                }
            }

            if (cc && typeof cc.error === "function") {
                var oldCcError = cc.error;
                cc.error = function () {
                    try {
                        var msg = Array.prototype.slice.call(arguments).join(" ");
                        pushRecord("MARK", "cc.error", {message: msg});
                    } catch (e) {
                    }
                    return oldCcError.apply(this, arguments);
                };
            }
        }
    };

    ErrorProbe = probe;
})();
