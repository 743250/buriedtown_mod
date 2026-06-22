/**
 * 截图测试日志记录器
 *
 * 用途：将 AutoUICapture 的日志写到文件，方便调试
 */

var CaptureLogger = {
    _logs: [],
    _enabled: true,

    /**
     * 记录日志
     */
    log: function(message) {
        if (!this._enabled) return;

        var timestamp = new Date().toISOString().substr(11, 12);
        var logLine = "[" + timestamp + "] " + message;

        this._logs.push(logLine);
        cc.log(logLine);
    },

    /**
     * 记录错误
     */
    error: function(message) {
        if (!this._enabled) return;

        var timestamp = new Date().toISOString().substr(11, 12);
        var logLine = "[" + timestamp + "] ERROR: " + message;

        this._logs.push(logLine);
        cc.error(logLine);
    },

    /**
     * 保存日志到文件
     */
    save: function() {
        if (!cc.sys.isNative || !jsb || !jsb.fileUtils) {
            cc.log("[CaptureLogger] Not in native environment, skip save");
            return;
        }

        try {
            var content = "=== AutoUICapture Log ===\n";
            content += "Time: " + new Date().toISOString() + "\n";
            content += "Total logs: " + this._logs.length + "\n";
            content += "===========================\n\n";
            content += this._logs.join("\n");

            var fileName = "ui_capture_debug.log";

            // 尝试保存到共享存储
            var possiblePaths = [
                "/sdcard/buriedtown_ui/",
                "/storage/emulated/0/buriedtown_ui/",
                "/mnt/sdcard/buriedtown_ui/"
            ];

            for (var i = 0; i < possiblePaths.length; i++) {
                var outputDir = possiblePaths[i];
                var fullPath = outputDir + fileName;

                try {
                    if (!jsb.fileUtils.isDirectoryExist(outputDir)) {
                        jsb.fileUtils.createDirectory(outputDir);
                    }

                    jsb.fileUtils.writeStringToFile(content, fullPath);

                    if (jsb.fileUtils.isFileExist(fullPath)) {
                        cc.log("[CaptureLogger] Log saved to: " + fullPath);
                        return fullPath;
                    }
                } catch (e) {
                    cc.warn("[CaptureLogger] Failed to save to " + outputDir + ": " + e.message);
                }
            }

            // Fallback：游戏私有目录
            var writablePath = jsb.fileUtils.getWritablePath();
            var fallbackPath = writablePath + fileName;
            jsb.fileUtils.writeStringToFile(content, fallbackPath);
            cc.log("[CaptureLogger] Log saved to fallback: " + fallbackPath);
            cc.warn("[CaptureLogger] Note: Need adb to access");

            return fallbackPath;
        } catch (e) {
            cc.error("[CaptureLogger] Failed to save log: " + e.message);
            return null;
        }
    },

    /**
     * 清空日志
     */
    clear: function() {
        this._logs = [];
    }
};

// 全局接口
if (typeof window !== "undefined") {
    window.CaptureLogger = CaptureLogger;
}
