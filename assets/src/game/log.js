/**
 * Created by lancelot on 15/1/27.
 */
var getLogRuntimeTimer = function () {
    if (typeof GameRuntime !== "undefined"
        && GameRuntime
        && typeof GameRuntime.getTimer === "function") {
        return GameRuntime.getTimer();
    }
    return typeof cc !== "undefined" && cc ? cc.timer : null;
};

var getLogRuntimeEmitter = function () {
    if (typeof GameRuntime !== "undefined"
        && GameRuntime
        && typeof GameRuntime.getEmitter === "function") {
        return GameRuntime.getEmitter();
    }
    return typeof utils !== "undefined" && utils ? utils.emitter : null;
};

var Log = cc.Class.extend({
    ctor: function () {
        this.logList = [];
    },
    addMsg: function (msg) {
        if (msg !== undefined && msg !== null) {
            if (typeof msg === 'number') {
                var args = [];
                for (var i = 0; i < arguments.length; i++) {
                    args.push(arguments[i]);
                }
                msg = stringUtil.getString.apply(this, args);
            }
            var msg = {
                txt: msg,
                time: getLogRuntimeTimer().getTimeDayStr() + " " + getLogRuntimeTimer().getTimeHourStr()
            };
            this.logList.push(msg);
            getLogRuntimeEmitter().emit("logChanged", msg);
        }
    }
});
