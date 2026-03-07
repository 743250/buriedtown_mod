/**
 * Resolves map entities into scene destinations so MapNode does not need to
 * keep hard-coded navigation branches inline.
 */
var MapDestinationRouter = {
    resolve: function (baseSite) {
        var route = {
            nodeName: Navigation.nodeName.NPC_NODE,
            userData: baseSite.id,
            logMessageId: 1116,
            logArgs: [baseSite.getName()]
        };

        if (!(baseSite instanceof Site)) {
            return route;
        }

        if (baseSite.id == HOME_SITE) {
            route.nodeName = Navigation.nodeName.HOME_NODE;
            route.logMessageId = 1111;
            route.logArgs = [];
            return route;
        }

        if (baseSite.id == AD_SITE) {
            route.nodeName = Navigation.nodeName.AD_SITE_NODE;
        } else if (baseSite.id == BOSS_SITE) {
            route.nodeName = Navigation.nodeName.BOSS_SITE_NODE;
        } else if (baseSite.id == WORK_SITE) {
            route.nodeName = Navigation.nodeName.WORK_SITE_NODE;
        } else {
            route.nodeName = Navigation.nodeName.SITE_NODE;
        }
        return route;
    },
    logArrival: function (route, log) {
        if (!route || !log || !route.logMessageId || typeof log.addMsg !== "function") {
            return;
        }
        var args = [route.logMessageId].concat(route.logArgs || []);
        log.addMsg.apply(log, args);
    }
};
