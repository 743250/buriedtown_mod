/**
 * Created by lancelot on 15/6/11.
 */
var IAPPackage = {
    _map: {},
    _record: {},
    initPackage: function () {

        this.initIAPRecord();
    },
    init: function (player) {
        if (this.isIAPUnlocked(102) && this.getChosenTalentPurchaseId() == 102) {
            player.hp += memoryUtil.changeEncode(60);
            player.hpMaxOrigin += memoryUtil.changeEncode(60);
            player.hpMax = player.hpMaxOrigin;
        }
    },

    getPreciseEffect: function (precise) {
        if (this.isIAPUnlocked(101) && this.getChosenTalentPurchaseId() == 101)
            return precise + (1 - precise) * 0.3;
        else
            return precise;
    },

    getDropEffect: function (produceValue) {
        if (this.isIAPUnlocked(103) && this.getChosenTalentPurchaseId() == 103)
            return produceValue * (1 + 0.1);
        else
            return produceValue;
    },

    isSocialEffectUnlocked: function () {
        return this.isIAPUnlocked(104) && this.getChosenTalentPurchaseId() == 104;
    },

    isBigBagUnlocked: function () {
        return this.isIAPUnlocked(105);
    },

    isBootUnlocked: function () {
        return this.isIAPUnlocked(106);
    },

    isDogHouseUnlocked: function () {
        return this.isIAPUnlocked(107);
    },

    initIAPRecord: function () {
        var record = cc.sys.localStorage.getItem("IAPRecord");
        if (record === undefined || record === null || record === "") {
            for (var IAPId in PurchaseList) {
                this._record[IAPId] = 0;
            }
        } else {
            this._record = JSON.parse(record);
            for (var IAPId in PurchaseList) {
                if (this._record[IAPId] === true) {
                    this._record[IAPId] = 1;
                } else if (this._record[IAPId] === false) {
                    this._record[IAPId] = 0;
                } else if (this._record[IAPId] === undefined || this._record[IAPId] === null) {
                    this._record[IAPId] = 0;
                }
            }
        }
    },
    saveIAPRecord: function () {
        cc.sys.localStorage.setItem("IAPRecord", JSON.stringify(this._record));
    },

    chooseTalent: function (purchaseId) {
        cc.sys.localStorage.setItem("chosenTalent", purchaseId);
    },
    getChosenTalentPurchaseId: function () {
        var purchaseId = cc.sys.localStorage.getItem("chosenTalent");
        if (purchaseId === undefined || purchaseId === null || purchaseId === "") {
            return 0;
        } else {
            return purchaseId;
        }
    },

    resetConsumeIAP: function () {
        this._record[201] = 0;
        this._record[202] = 0;
        this._record[203] = 0;
        this._record[204] = 0;
        this._record[205] = 0;
        this._record[206] = 0;
        this._record[207] = 0;
        this.saveIAPRecord();
    },
    onIAPPaied: function (purchaseId) {
        this._record[purchaseId]++;
        this.saveIAPRecord();
    },
    payConsumeIAP: function (purchaseId) {
        var effect = PurchaseList[purchaseId].effect;
        effect.forEach(function (obj) {
            player.storage.increaseItem(obj.itemId, obj.num);
        });
        Record.saveAll();
        this.onIAPPaied(purchaseId);
    },
    isIAPUnlocked: function (purchaseId) {
        if (purchaseId == 0) {
            return true;
        } else {
            if (PurchaseList[purchaseId].multiPrice) {
                return this._record[purchaseId] >= 3;
            } else {
                return this._record[purchaseId] > 0;
            }
        }
    },
    getPurchaseConfig: function (purchaseId) {
        var purchaseInfo = PurchaseList[purchaseId];
        var priceInfoIndex = 0;
        if (purchaseInfo.multiPrice) {
            priceInfoIndex = this._record[purchaseId];
            priceInfoIndex = Math.min(priceInfoIndex, purchaseInfo.priceList.length - 1);
        }
        var config = utils.clone(purchaseInfo.priceList[priceInfoIndex]);
        config.multiPrice = purchaseInfo.multiPrice;
        if (purchaseInfo.effect) {
            config.effect = purchaseInfo.effect;
        }
        config.priceIndex = priceInfoIndex;
        return config;
    },
    getPriceOff: function (purchaseId) {
        var purchaseInfo = PurchaseList[purchaseId];
        if (purchaseInfo.multiPrice) {
            var priceList = purchaseInfo.priceList;
            var priceInfoIndex = this._record[purchaseId];
            priceInfoIndex = Math.min(priceInfoIndex, priceList.length - 1);
            var off = Math.floor((priceList[priceList.length - 1].price - priceList[priceInfoIndex].price) / priceList[priceList.length - 1].price * 100);
            return off;
        } else {
            if (purchaseId == 206 || purchaseId == 207) {
                return 50;
            } else {
                return 0;
            }
        }
    }
};
