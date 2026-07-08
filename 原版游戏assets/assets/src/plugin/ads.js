/**
 * Created by lancelot on 15/12/8.
 */

var admob = AdController.extend({
    ctor: function () {
        cc.log("admob ctor");
        jsb.reflection.callStaticMethod("net/dice7/pay/googleplay/Admob", "init", "()V");
    },
    preloadAd: function () {
        jsb.reflection.callStaticMethod("net/dice7/pay/googleplay/Admob", "preloadAd", "()V");
    },
    showAd: function () {
        jsb.reflection.callStaticMethod("net/dice7/pay/googleplay/Admob", "showAd", "()V");
    },
    hideAd: function () {
        jsb.reflection.callStaticMethod("net/dice7/pay/googleplay/Admob", "hideAd", "()V");
    }
});

var u3d = AdController.extend({
    ctor: function () {
        jsb.reflection.callStaticMethod("net/dice7/pay/googleplay/u3d", "init", "()V");
    },
    preloadAd: function () {
        jsb.reflection.callStaticMethod("net/dice7/pay/googleplay/u3d", "preloadAd", "()V");
    },
    showAd: function () {
        jsb.reflection.callStaticMethod("net/dice7/pay/googleplay/u3d", "showAd", "()V");
    },
    hideAd: function () {
        jsb.reflection.callStaticMethod("net/dice7/pay/googleplay/u3d", "hideAd", "()V");
    }
});


var chartboost = AdController.extend({

    adName: 'Level Complete',

    ctor: function () {

        cc.log("admob ctor");
        sdkbox.PluginChartboost.init();
        sdkbox.PluginChartboost.setListener(this);

    },
    preloadAd: function () {
        sdkbox.PluginChartboost.cache(this.adName);
        cc.log('cache ' + this.adName)
        cc.log('available ' + sdkbox.PluginChartboost.isAvailable(this.adName));
        if (sdkbox.PluginChartboost.isAvailable(this.adName)) {
            adHelper.onAdStatusChange(adHelper.AD_STATUS_READY);
        }
    },
    showAd: function () {
        sdkbox.PluginChartboost.show(this.adName);
    },
    hideAd: function () {
    },


    onChartboostCached: function (name) {
        cc.log("onChartboostCached " + name)
        if (name == this.adName) {
            adHelper.onAdStatusChange(adHelper.AD_STATUS_READY);
        }
    },
    onChartboostShouldDisplay: function (name) {
        cc.log("onChartboostShouldDisplay " + name)
    },
    onChartboostDisplay: function (name) {
        cc.log("onChartboostDisplay " + name)
        if (name == this.adName) {
            adHelper.onAdStatusChange(adHelper.AD_STATUS_SHOW);
        }
    },
    onChartboostDismiss: function (name) {
        cc.log("onChartboostDismiss " + name)
    },
    onChartboostClose: function (name) {
        cc.log("onChartboostClose " + name)
    },
    onChartboostClick: function (name) {
        cc.log("onChartboostClick " + name)
    },
    onChartboostReward: function (name, reward) {
        cc.log("onChartboostReward " + name + " reward " + reward)
        if (name == this.adName) {
            adHelper.onAdStatusChange(adHelper.AD_STATUS_DISMISS);
        }
    },
    onChartboostFailedToLoad: function (name, e) {
        cc.log("onChartboostFailedToLoad " + name + " load error " + e)
        if (name == this.adName) {
            adHelper.onAdStatusChange(adHelper.AD_STATUS_ERROR);
        }
    },
    onChartboostFailToRecordClick: function (name, e) {
        cc.log("onChartboostFailToRecordClick " + name + " click error " + e)
    },
    onChartboostConfirmation: function () {
        cc.log("onChartboostConfirmation")
    },
    onChartboostCompleteStore: function () {
        cc.log("onChartboostCompleteStore")
    }
});