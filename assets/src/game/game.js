/**
 * Created by lancelot on 15/5/16.
 */
var player;
var game = {
    init: function () {
        Record.init(Record.getCurrentRecordName());
        Navigation.init();
        if (utils.emitter) {
            utils.emitter.removeAllListeners();
        }
        utils.emitter = new Emitter();
        cc.timer = new TimerManager();
        player = new Player();
        player.restore();
        userGuide.init();
        Medal.initCompletedForOneGame(false);
        if (!Record.restore('randomPack')) {
            Record.save('randomPack', utils.getRandomInt(1, 2));
        }
    },
    start: function () {
        player.start();
        if (typeof IAPPackage !== "undefined"
            && IAPPackage
            && typeof IAPPackage.applyActiveTalentStartGifts === "function") {
            var gifted = IAPPackage.applyActiveTalentStartGifts(player);
            if (gifted && typeof Record !== "undefined" && Record && typeof Record.saveAll === "function") {
                Record.saveAll();
            }
        }
    },
    stop: function () {
        if (cc.timer) {
            cc.timer.stop();
        }
    },
    newGame: function () {
        Record.deleteRecord(Record.getCurrentRecordName());
        Record.setType(-1);
        IAPPackage.resetConsumeIAP();
        Medal.newGameReset();
        Medal.initCompletedForOneGame(true);
    },
    relive: function () {
        this.init();
        this.start();
        player.relive();
    }
};
