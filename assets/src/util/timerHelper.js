/**
 * 定时器管理工具
 * 统一定时器创建和管理逻辑
 */

var TimerHelper = {
    /**
     * 创建进度定时器（带进度回调）
     * @param {number} duration - 持续时间
     * @param {object} target - 目标对象
     * @param {function} onProgress - 进度回调 function(dt, percentage)
     * @param {function} onComplete - 完成回调
     * @param {number} startTime - 起始时间（可选）
     * @param {boolean} accelerate - 是否加速工作时间（默认true）
     */
    createProgressTimer: function(duration, target, onProgress, onComplete, startTime, accelerate) {
        if (accelerate !== false) {
            accelerate = true;
        }

        var pastTime = startTime || 0;
        var timerStartTime = startTime ? cc.timer.time - startTime : undefined;

        var callback = new TimerCallback(duration, target, {
            process: function(dt) {
                pastTime += dt;
                var percentage = pastTime / duration;
                if (onProgress) {
                    onProgress.call(target, dt, percentage, pastTime);
                }
            },
            end: function() {
                if (onComplete) {
                    onComplete.call(target);
                }
            }
        });

        cc.timer.addTimerCallback(callback, timerStartTime);

        if (accelerate) {
            cc.timer.accelerateWorkTime(duration);
        }

        return callback;
    },

    /**
     * 创建简单延迟定时器
     */
    delay: function(duration, target, callback) {
        return this.createProgressTimer(duration, target, null, callback, 0, false);
    }
};
