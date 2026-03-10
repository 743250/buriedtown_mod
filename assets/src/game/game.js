/**
 * Created by lancelot on 15/5/16.
 */
var player;
var getBuriedTownSessionService = function () {
    if (typeof BuriedTownBootstrap === "undefined"
        || !BuriedTownBootstrap
        || typeof BuriedTownBootstrap.getAppContext !== "function") {
        return null;
    }

    var appContext = BuriedTownBootstrap.getAppContext();
    if (!appContext || !appContext.services) {
        return null;
    }
    return appContext.services.session || null;
};
var game = {
    init: function () {
        var sessionService = getBuriedTownSessionService();
        if (sessionService && typeof sessionService.initRuntime === "function") {
            return sessionService.initRuntime();
        }
        cc.error("[game] session service unavailable: init");
        return null;
    },
    start: function () {
        var sessionService = getBuriedTownSessionService();
        if (sessionService && typeof sessionService.startRuntime === "function") {
            return sessionService.startRuntime();
        }
        cc.error("[game] session service unavailable: start");
    },
    stop: function () {
        var sessionService = getBuriedTownSessionService();
        if (sessionService && typeof sessionService.stopRuntime === "function") {
            return sessionService.stopRuntime();
        }
        cc.error("[game] session service unavailable: stop");
    },
    newGame: function () {
        var sessionService = getBuriedTownSessionService();
        if (sessionService && typeof sessionService.prepareNewGame === "function") {
            return sessionService.prepareNewGame();
        }
        cc.error("[game] session service unavailable: newGame");
    },
    relive: function () {
        var sessionService = getBuriedTownSessionService();
        if (sessionService && typeof sessionService.reliveRuntime === "function") {
            return sessionService.reliveRuntime();
        }
        cc.error("[game] session service unavailable: relive");
    }
};
