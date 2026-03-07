/**
 * Computes route modifiers for zipline-connected map travel.
 */
var ZiplineTravelService = {
    CONFIG: {
        TIME_RATIO: 0.3
    },
    getDefaultRouteState: function () {
        return {
            hasZipline: false,
            timeMultiplier: 1,
            velocityMultiplier: 1,
            accelerateRealTimeMultiplier: 1
        };
    },
    buildRouteState: function (options) {
        var routeState = this.getDefaultRouteState();
        if (!options
            || options.roleType !== RoleType.BELL
            || !options.ziplineNetwork
            || !(options.destinationEntity || options.destinationSite)
            || typeof options.ziplineNetwork.hasLink !== "function") {
            return routeState;
        }

        var currentEntityRef = options.currentEntityKey || options.currentSiteId;
        var destinationEntity = options.destinationEntity || options.destinationSite;
        if (!options.ziplineNetwork.hasLink(currentEntityRef, destinationEntity, options.map)) {
            return routeState;
        }

        routeState.hasZipline = true;
        routeState.timeMultiplier = this.CONFIG.TIME_RATIO;
        routeState.velocityMultiplier = 1 / this.CONFIG.TIME_RATIO;
        routeState.accelerateRealTimeMultiplier = this.CONFIG.TIME_RATIO;
        return routeState;
    }
};
