/**
 * Created by lancelot on 15/5/16.
 */
var player;
var getGameRuntimePlayer = function () {
    return GameRuntime.requirePlayer();
};
var getGameRuntimeTimer = function () {
    return GameRuntime.requireTimer();
};
var getGameRuntimeRecord = function () {
    return GameRuntime.requireRecord();
};
var game = {
    init: function () {
        Record.init(Record.getCurrentRecordName());
        GameRuntime.bootstrap({record: Record});
        Navigation.init();
        var previousEmitter = GameRuntime.getEmitter();
        if (previousEmitter && typeof previousEmitter.removeAllListeners === "function") {
            previousEmitter.removeAllListeners();
        }
        GameRuntime.setEmitter(new Emitter());
        GameRuntime.setTimer(new TimerManager());
        GameRuntime.setPlayer(new Player());
        if (typeof Record.bindRuntime === "function") {
            Record.bindRuntime(GameRuntime);
        }
        getGameRuntimePlayer().restore();
        userGuide.init();
        Medal.initCompletedForOneGame(false);
        if (!Record.restore('randomPack')) {
            Record.save('randomPack', utils.getRandomInt(1, 2));
        }
    },
    start: function () {
        var runtimePlayer = getGameRuntimePlayer();
        runtimePlayer.start();
        if (typeof TalentService !== "undefined"
            && TalentService
            && typeof TalentService.applyActiveTalentStartGifts === "function") {
            var gifted = TalentService.applyActiveTalentStartGifts(runtimePlayer);
            if (gifted) {
                getGameRuntimeRecord().saveAll();
            }
        }
    },
    stop: function () {
        getGameRuntimeTimer().stop();
    },
    newGame: function () {
        Record.deleteRecord(Record.getCurrentRecordName());
        Record.setType(-1);
        if (typeof PurchaseService !== "undefined"
            && PurchaseService
            && typeof PurchaseService.resetConsumablePurchases === "function") {
            PurchaseService.resetConsumablePurchases();
        }
        Medal.newGameReset();
        Medal.initCompletedForOneGame(true);
    },
    relive: function () {
        this.init();
        this.start();
        getGameRuntimePlayer().relive();
    }
};
