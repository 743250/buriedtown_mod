/**
 * Computes route modifiers for zipline-connected map travel.
 */
var ZiplineTravelService = {
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
        var ziplineConfig = RoleRuntimeService.getZiplineConfig(options && options.roleType);
        if (!options
            || !ziplineConfig.enabled
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
        routeState.timeMultiplier = ziplineConfig.timeRatio;
        routeState.velocityMultiplier = 1 / ziplineConfig.timeRatio;
        routeState.accelerateRealTimeMultiplier = ziplineConfig.timeRatio;
        return routeState;
    }
};
