/**
 * 自动UI截图巡游脚本
 *
 * 用途：AI调试模式下自动遍历关键场景，导出JSON + 截图
 *
 * 使用：
 *   1. 在MenuScene或其他入口场景调用 AutoUICapture.start()
 *   2. 脚本会自动切换场景、等待渲染、截图、导出JSON
 *   3. 完成后自动退出游戏
 *
 * 输出：
 *   - /data/data/com.hygd.buriedtown/files/capture_<scene>.json
 *   - /data/data/com.termux/files/home/AI code工作区/buriedtown_mod/assets/src/util/autoUICapture.js/screenshot_<scene>.png
 */

var AutoUICapture = {
    // 是否正在运行
    _isRunning: false,

    // 当前巡游索引
    _currentIndex: 0,

    // 巡游路线配置
    _captureRoutes: [
        {
            name: "MenuScene",
            sceneClass: "MenuScene",
            waitTime: 1.0,
            setupFn: null
        },
        {
            name: "ChooseScene",
            sceneClass: "ChooseScene",
            waitTime: 1.5,
            setupFn: null
        }
        // MainScene 路线会在运行时动态添加（如果有存档）
    ],

    /**
     * 初始化巡游路线（检查存档）
     * @private
     */
    _initRoutes: function() {
        // 基础路线
        this._captureRoutes = [
            {
                name: "MenuScene",
                sceneClass: "MenuScene",
                waitTime: 1.0,
                setupFn: null
            },
            {
                name: "ChooseScene",
                sceneClass: "ChooseScene",
                waitTime: 1.5,
                setupFn: null
            }
        ];

        // 如果有存档，添加 MainScene 测试
        if (typeof Record !== "undefined" && Record.hasAnyRecord && Record.hasAnyRecord()) {
            cc.log("[AutoUICapture] Found save data, adding MainScene routes");

            // 添加 MainScene 路线
            this._captureRoutes.push({
                name: "MainScene_Home",
                sceneClass: "MainScene",
                waitTime: 2.0,
                setupFn: function() {
                    // 加载存档
                    if (typeof Record !== "undefined" && Record.loadRecord) {
                        var slot = Record.getLastUsedSlot ? Record.getLastUsedSlot() : 1;
                        cc.log("[AutoUICapture]   Loading save slot: " + slot);
                        Record.loadRecord(slot);
                    }
                }
            });

            this._captureRoutes.push({
                name: "MainScene_Map",
                sceneClass: "MainScene",
                waitTime: 1.5,
                setupFn: function() {
                    // 打开地图
                    var scene = cc.director.getRunningScene();
                    if (scene && scene.mapNode && scene.mapNode.show) {
                        scene.mapNode.show();
                    }
                }
            });
        } else {
            cc.log("[AutoUICapture] No save data found, only testing MenuScene and ChooseScene");
        }
    },

    /**
     * 启动自动巡游
     */
    start: function() {
        if (this._isRunning) {
            cc.log("[AutoUICapture] Already running");
            return;
        }

        cc.log("[AutoUICapture] ====================================");
        cc.log("[AutoUICapture] Starting auto capture tour...");

        // 初始化路线（根据是否有存档）
        this._initRoutes();

        cc.log("[AutoUICapture] Total routes: " + this._captureRoutes.length);
        cc.log("[AutoUICapture] UiExporter available: " + (typeof window.UiExporter !== "undefined"));
        cc.log("[AutoUICapture] cc.RenderTexture available: " + (typeof cc.RenderTexture !== "undefined"));
        cc.log("[AutoUICapture] jsb.fileUtils available: " + (typeof jsb !== "undefined" && typeof jsb.fileUtils !== "undefined"));
        if (typeof jsb !== "undefined" && jsb.fileUtils) {
            cc.log("[AutoUICapture] Output path: " + jsb.fileUtils.getWritablePath());
        }
        cc.log("[AutoUICapture] ====================================");

        this._isRunning = true;
        this._currentIndex = 0;

        this._processNext();
    },

    /**
     * 处理下一个场景
     * @private
     */
    _processNext: function() {
        if (this._currentIndex >= this._captureRoutes.length) {
            this._finish();
            return;
        }

        var route = this._captureRoutes[this._currentIndex];
        cc.log("[AutoUICapture] [" + (this._currentIndex + 1) + "/" + this._captureRoutes.length + "] Processing: " + route.name);

        this._loadScene(route);
    },

    /**
     * 加载场景
     * @private
     */
    _loadScene: function(route) {
        var self = this;

        var currentScene = cc.director.getRunningScene();
        var currentSceneName = currentScene ? currentScene.constructor.name : "";

        // 如果已经在目标场景且没有特殊setup，直接捕获
        if (currentSceneName === route.sceneClass && !route.setupFn) {
            self._captureCurrentScene(route);
            return;
        }

        // 如果需要切换场景
        if (currentSceneName !== route.sceneClass) {
            if (typeof window[route.sceneClass] !== "function") {
                cc.error("[AutoUICapture] Scene class not found: " + route.sceneClass);
                self._currentIndex++;
                self._processNext();
                return;
            }

            try {
                cc.director.runScene(new window[route.sceneClass]());
            } catch (e) {
                cc.error("[AutoUICapture] Failed to load scene " + route.sceneClass + ": " + e.message);
                self._currentIndex++;
                self._processNext();
                return;
            }
        }

        // 等待场景稳定后捕获
        setTimeout(function() {
            self._captureCurrentScene(route);
        }, route.waitTime * 1000);
    },

    /**
     * 捕获当前场景
     * @private
     */
    _captureCurrentScene: function(route) {
        var self = this;

        try {
            // 执行场景特定的setup（如果有）
            if (route.setupFn && typeof route.setupFn === "function") {
                cc.log("[AutoUICapture]   Executing setup function...");
                route.setupFn();

                // setup后再等一小会儿
                setTimeout(function() {
                    self._doCapture(route);
                }, 500);
            } else {
                self._doCapture(route);
            }

        } catch (e) {
            cc.error("[AutoUICapture] Failed to capture " + route.name + ": " + e.message);
            cc.error(e.stack);

            // 继续下一个
            this._currentIndex++;
            this._processNext();
        }
    },

    /**
     * 执行实际的捕获操作
     * @private
     */
    _doCapture: function(route) {
        var self = this;

        try {
            cc.log("[AutoUICapture]   === Starting capture for: " + route.name + " ===");

            // 1. 导出JSON
            var jsonFileName = "capture_" + route.name + ".json";
            if (window.UiExporter) {
                cc.log("[AutoUICapture]   [1/2] Exporting JSON: " + jsonFileName);
                var result = window.UiExporter.exportCurrentScene(jsonFileName);
                if (result) {
                    cc.log("[AutoUICapture]   [1/2] ✓ JSON export success");
                } else {
                    cc.error("[AutoUICapture]   [1/2] ✗ JSON export failed");
                }
            } else {
                cc.error("[AutoUICapture]   [1/2] ✗ UiExporter not available");
            }

            // 2. 截图
            var pngFileName = "screenshot_" + route.name + ".png";
            cc.log("[AutoUICapture]   [2/2] Taking screenshot: " + pngFileName);
            this._takeScreenshot(route.name);

            cc.log("[AutoUICapture]   === Capture complete for: " + route.name + " ===");

        } catch (e) {
            cc.error("[AutoUICapture]   Capture error: " + e.message);
            cc.error(e.stack);
        }

        // 继续下一个
        this._currentIndex++;

        setTimeout(function() {
            self._processNext();
        }, 500);
    },

    /**
     * 截图
     * @private
     */
    _takeScreenshot: function(sceneName) {
        cc.log("[AutoUICapture]     >> Screenshot start for: " + sceneName);

        if (!cc.sys.isNative) {
            cc.warn("[AutoUICapture]     >> Not native platform, skip screenshot");
            return;
        }

        try {
            cc.log("[AutoUICapture]     >> Creating RenderTexture...");
            var winSize = cc.winSize;
            var renderTexture = new cc.RenderTexture(winSize.width, winSize.height);

            if (!renderTexture) {
                cc.error("[AutoUICapture]     >> ✗ Failed to create RenderTexture");
                return;
            }
            cc.log("[AutoUICapture]     >> ✓ RenderTexture created: " + winSize.width + "x" + winSize.height);

            // 渲染当前场景到纹理
            cc.log("[AutoUICapture]     >> Rendering scene to texture...");
            var scene = cc.director.getRunningScene();
            renderTexture.begin();
            scene.visit();
            renderTexture.end();
            cc.log("[AutoUICapture]     >> ✓ Scene rendered");

            // 尝试保存到共享存储
            var fileName = "screenshot_" + sceneName + ".png";
            var possiblePaths = [
                "/sdcard/buriedtown_ui/",
                "/storage/emulated/0/buriedtown_ui/",
                "/mnt/sdcard/buriedtown_ui/"
            ];

            var success = false;
            for (var i = 0; i < possiblePaths.length; i++) {
                var outputDir = possiblePaths[i];
                var fullPath = outputDir + fileName;

                try {
                    if (!jsb.fileUtils.isDirectoryExist(outputDir)) {
                        jsb.fileUtils.createDirectory(outputDir);
                    }

                    cc.log("[AutoUICapture]     >> Trying: " + fullPath);

                    if (renderTexture.saveToFile) {
                        success = renderTexture.saveToFile(fullPath, cc.IMAGE_FORMAT_PNG);
                        if (success && jsb.fileUtils.isFileExist(fullPath)) {
                            cc.log("[AutoUICapture]     >> ✓ Screenshot saved to: " + fullPath);
                            return;
                        }
                    }
                } catch (e) {
                    cc.warn("[AutoUICapture]     >> Failed path " + outputDir + ": " + e.message);
                }
            }

            // Fallback：游戏私有目录
            if (!success) {
                cc.warn("[AutoUICapture]     >> All shared paths failed, using private directory");
                var writablePath = jsb.fileUtils.getWritablePath();
                var fallbackPath = writablePath + fileName;

                if (renderTexture.saveToFile) {
                    success = renderTexture.saveToFile(fileName, cc.IMAGE_FORMAT_PNG);
                    if (success) {
                        cc.log("[AutoUICapture]     >> Screenshot saved to fallback: " + fallbackPath);
                        cc.warn("[AutoUICapture]     >> Note: Need adb to access this file");
                    }
                }
            }

        } catch (e) {
            cc.error("[AutoUICapture]     >> ✗ Screenshot error: " + e.message);
            cc.error(e.stack);
        }
    },

    /**
     * 完成巡游
     * @private
     */
    _finish: function() {
        var outputPath = jsb.fileUtils ? jsb.fileUtils.getWritablePath() : "/data/data/com.hygd.buriedtown/files/";

        cc.log("[AutoUICapture] ====================================");
        cc.log("[AutoUICapture] Tour completed!");
        cc.log("[AutoUICapture] Captured " + this._captureRoutes.length + " scenes");
        cc.log("[AutoUICapture] Files saved to: " + outputPath);

        // 保存日志文件
        if (typeof window.CaptureLogger !== "undefined") {
            var logPath = window.CaptureLogger.save();
            if (logPath) {
                cc.log("[AutoUICapture] Debug log saved to: " + logPath);
            }
        }

        cc.log("[AutoUICapture] ====================================");

        this._isRunning = false;

        // 自动退出游戏
        if (cc.sys.isNative) {
            cc.log("[AutoUICapture] Exiting game in 3 seconds...");
            setTimeout(function() {
                if (cc.director && cc.director.end) {
                    cc.director.end();
                } else if (cc.game && cc.game.end) {
                    cc.game.end();
                }
            }, 3000);
        }
    },

    /**
     * 停止巡游（手动中断）
     */
    stop: function() {
        if (!this._isRunning) {
            return;
        }

        cc.log("[AutoUICapture] Stopping tour...");
        this._isRunning = false;
        this._currentIndex = 0;
    }
};

// 全局接口
if (typeof window !== "undefined") {
    window.AutoUICapture = AutoUICapture;
}
