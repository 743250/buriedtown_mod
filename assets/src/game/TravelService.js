/**
 * TravelService centralizes map travel calculations so route modifiers,
 * movement speed, displayed time and time acceleration stay in sync.
 */
var TravelService = {
    CONFIG: {
        BASE_VELOCITY: 97 / (1 * 60 * 60) * 0.8 * 1.1,
        BOOTS_ACCELERATE_REAL_TIME: 2,
        DEFAULT_ACCELERATE_REAL_TIME: 3,
        ITEMS: {
            BOOTS: 1304024,
            MOTO: 1305034,
            ZHANSUN: 1305044
        },
        VELOCITY_BONUS: {
            BOOTS: 0.25,
            MOTO: 0.35,
            ZHANSUN: 0.45
        }
    },
    getBaseVelocity: function () {
        return this.CONFIG.BASE_VELOCITY;
    },
    hasTravelItem: function (storage, itemId) {
        return !!(storage &&
            typeof storage.getNumByItemId === "function" &&
            storage.getNumByItemId(itemId) > 0);
    },
    getVehicleVelocityBonus: function (storage, baseVelocity) {
        if (this.hasTravelItem(storage, this.CONFIG.ITEMS.ZHANSUN)) {
            return baseVelocity * this.CONFIG.VELOCITY_BONUS.ZHANSUN;
        }
        if (this.hasTravelItem(storage, this.CONFIG.ITEMS.MOTO)) {
            return baseVelocity * this.CONFIG.VELOCITY_BONUS.MOTO;
        }
        return 0;
    },
    getFootwearVelocityBonus: function (storage, baseVelocity) {
        if (!this.hasTravelItem(storage, this.CONFIG.ITEMS.BOOTS)) {
            return 0;
        }
        return baseVelocity * this.CONFIG.VELOCITY_BONUS.BOOTS;
    },
    getWeatherVelocityBonus: function (weather, baseVelocity) {
        if (!weather || typeof weather.getValue !== "function") {
            return 0;
        }
        return baseVelocity * weather.getValue("speed");
    },
    getEffectiveVelocity: function (storage, weather) {
        var baseVelocity = this.getBaseVelocity();
        return baseVelocity +
            this.getVehicleVelocityBonus(storage, baseVelocity) +
            this.getFootwearVelocityBonus(storage, baseVelocity) +
            this.getWeatherVelocityBonus(weather, baseVelocity);
    },
    getRouteModifiers: function (options) {
        var hasBoots = this.hasTravelItem(options.storage, this.CONFIG.ITEMS.BOOTS);
        var accelerateRealTime = hasBoots ?
            this.CONFIG.BOOTS_ACCELERATE_REAL_TIME :
            this.CONFIG.DEFAULT_ACCELERATE_REAL_TIME;
        var ziplineRouteState = (typeof ZiplineTravelService !== "undefined" && ZiplineTravelService)
            ? ZiplineTravelService.buildRouteState(options)
            : {
                hasZipline: false,
                timeMultiplier: 1,
                velocityMultiplier: 1,
                accelerateRealTimeMultiplier: 1
            };

        return {
            hasBoots: hasBoots,
            hasZipline: ziplineRouteState.hasZipline,
            velocityMultiplier: ziplineRouteState.velocityMultiplier || 1,
            accelerateRealTime: accelerateRealTime * (ziplineRouteState.accelerateRealTimeMultiplier || 1)
        };
    },
    buildPlan: function (options) {
        var startPos = options.startPos;
        var endPos = options.endPos;
        var distance = cc.pDistance(startPos, endPos);
        var routeModifiers = this.getRouteModifiers(options);
        var effectiveVelocity = this.getEffectiveVelocity(options.storage, options.weather);
        var travelVelocity = effectiveVelocity * routeModifiers.velocityMultiplier;
        var gameTimeCost = distance / travelVelocity;

        return {
            startPos: startPos,
            endPos: endPos,
            distance: distance,
            baseVelocity: this.getBaseVelocity(),
            effectiveVelocity: effectiveVelocity,
            travelVelocity: travelVelocity,
            gameTimeCost: gameTimeCost,
            displayTime: gameTimeCost,
            accelerateRealTime: routeModifiers.accelerateRealTime,
            hasBoots: routeModifiers.hasBoots,
            hasZipline: routeModifiers.hasZipline
        };
    }
};
