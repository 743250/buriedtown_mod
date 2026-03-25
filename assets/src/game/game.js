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
    _appInitialized: false,
    _runBootstrapped: false,
    _runStarted: false,
    initApp: function () {
        if (this._appInitialized) {
            return false;
        }

        if (typeof ClientData !== "undefined" && ClientData) {
            ClientData.CHANNEL = "" + CommonUtil.getMetaDataInt("channelId");
            ClientData.CLIENT_VERSION = CommonUtil.getMetaData("versionName");
        }
        if (typeof paramManager !== "undefined"
            && paramManager
            && typeof paramManager.init === "function") {
            paramManager.init();
        }
        if (typeof PurchaseService !== "undefined"
            && PurchaseService
            && typeof PurchaseService.initPackage === "function") {
            PurchaseService.initPackage();
        }
        if (typeof PurchaseAndroid !== "undefined" && PurchaseAndroid) {
            var sdkType = CommonUtil.getMetaData("sdk_type");
            var shouldBypassNativePayInit = (typeof PurchaseService !== "undefined"
                    && PurchaseService
                    && typeof PurchaseService.isPaySdkBypassedForTest === "function"
                    && PurchaseService.isPaySdkBypassedForTest())
                || sdkType === PurchaseAndroid.PAY_TYPE_GOOGLE_PLAY;
            if (shouldBypassNativePayInit) {
                PurchaseAndroid.payType = sdkType || PurchaseAndroid.PAY_TYPE_TEST;
            } else if (typeof PurchaseAndroid.init === "function") {
                PurchaseAndroid.init(sdkType, {});
            }
        }
        if (typeof adHelper !== "undefined"
            && adHelper
            && typeof adHelper.init === "function"
            && typeof paramManager !== "undefined"
            && paramManager
            && typeof paramManager.getAdType === "function") {
            adHelper.init(paramManager.getAdType());
        }
        if (typeof networkUtil !== "undefined"
            && networkUtil
            && typeof networkUtil.init === "function") {
            networkUtil.init();
        }
        if (typeof DataLog !== "undefined"
            && DataLog
            && typeof DataLog.loadFromLocal === "function") {
            DataLog.loadFromLocal();
        }
        if (typeof Medal !== "undefined"
            && Medal
            && typeof Medal.init === "function") {
            Medal.init();
        }
        if (!cc.sys.localStorage.getItem("AccountId")
            && typeof Record !== "undefined"
            && Record
            && typeof Record.getUUID === "function") {
            cc.sys.localStorage.setItem("AccountId", Record.getUUID());
        }

        this._appInitialized = true;
        return true;
    },
    bootstrapRun: function () {
        this.initApp();
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
        this._runBootstrapped = true;
        this._runStarted = false;
        return GameRuntime;
    },
    startRun: function () {
        if (!this._runBootstrapped) {
            this.bootstrapRun();
        }
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
        this._runStarted = true;
        return runtimePlayer;
    },
    init: function () {
        return this.bootstrapRun();
    },
    start: function () {
        return this.startRun();
    },
    stop: function () {
        getGameRuntimeTimer().stop();
        this._runStarted = false;
    },
    resetCurrentRun: function () {
        this.initApp();
        Record.deleteRecord(Record.getCurrentRecordName());
        Record.setType(-1);
        if (typeof PurchaseService !== "undefined"
            && PurchaseService
            && typeof PurchaseService.resetConsumablePurchases === "function") {
            PurchaseService.resetConsumablePurchases();
        }
        Medal.newGameReset();
        Medal.initCompletedForOneGame(true);
        this._runBootstrapped = false;
        this._runStarted = false;
    },
    newGame: function () {
        return this.resetCurrentRun();
    },
    reliveRun: function () {
        this.bootstrapRun();
        this.startRun();
        getGameRuntimePlayer().relive();
    },
    relive: function () {
        return this.reliveRun();
    }
};
