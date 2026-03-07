/**
 * 统一错误处理工具
 */

var ErrorHandler = {
    _logLevel: 1, // 1=ERROR, 2=WARN, 3=INFO

    /**
     * 记录错误日志
     */
    logError: function(context, error, extraInfo) {
        var errorMsg = error instanceof Error ? error.message : error;
        var logMsg = "[ERROR] " + context + ": " + errorMsg;

        if (extraInfo !== undefined) {
            logMsg += " | " + JSON.stringify(extraInfo);
        }

        cc.log(logMsg);

        if (this._logLevel >= 3 && error instanceof Error && error.stack) {
            cc.log(error.stack);
        }
    },

    /**
     * 安全执行函数
     */
    safeExecute: function(fn, context, fallback) {
        if (typeof fn !== "function") {
            this.logError(context, "fn is not a function");
            return fallback;
        }

        try {
            var args = Array.prototype.slice.call(arguments, 3);
            return fn.apply(null, args);
        } catch (error) {
            this.logError(context, error);
            return fallback;
        }
    }
};
