var UMeng = {
    init: function () {
        if (cc.sys.isNative && cc.sys.os == cc.sys.OS_IOS) {
            var pluginManager = plugin.PluginManager.getInstance();

            this.umeng = pluginManager.loadPlugin("AnalyticsUmeng");
            this.umeng.startSession("55643fb167e58e417000101e");
        }

    },

    logEvent: function (event) {
        if (cc.sys.os == cc.sys.OS_IOS) {
            this.umeng.logEvent(event);
        }
    }
};
