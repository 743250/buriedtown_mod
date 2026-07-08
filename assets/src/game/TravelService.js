/**
 * TravelService centralizes map travel calculations so route modifiers,
 * movement speed, displayed time and time acceleration stay in sync.
 */
var TravelService = {
    CONFIG: {
        BASE_VELOCITY: 97 / (1 * 60 * 60) * 0.8 * 1.1,
        DEFAULT_ACCELERATE_REAL_TIME: 3
    },
    getBaseVelocity: function () {
        return this.CONFIG.BASE_VELOCITY;
    },
    hasTravelItem: function (storage, itemId) {
        return !!(storage &&
            typeof storage.getNumByItemId === "function" &&
            storage.getNumByItemId(itemId) > 0);
    },
    _resolveItemConfig: function (itemId) {
        var entry = itemConfig[itemId];
        if (!entry || !entry.travelKind) {
            return null;
        }
        return entry;
    },
    _collectTravelEntries: function (storage, kind) {
        var entries = [];
        if (!storage || typeof storage.forEach !== "function") {
            return entries;
        }
        storage.forEach(function (item, num) {
            if (num <= 0) {
                return;
            }
            var entry = itemConfig[item.id];
            if (entry && entry.travelKind === kind && entry.travelSpeedBonus > 0) {
                entries.push(entry);
            }
        });
        return entries;
    },
    _maxSpeedBonus: function (entries, baseVelocity) {
        var max = 0;
        for (var i = 0; i < entries.length; i++) {
            if (entries[i].travelSpeedBonus > max) {
                max = entries[i].travelSpeedBonus;
            }
        }
        return baseVelocity * max;
    },
    getVehicleVelocityBonus: function (storage, baseVelocity) {
        return this._maxSpeedBonus(this._collectTravelEntries(storage, "vehicle"), baseVelocity);
    },
    getFootwearVelocityBonus: function (storage, baseVelocity) {
        var entries = this._collectTravelEntries(storage, "footwear");
        var bonus = baseVelocity
            ? this._maxSpeedBonus(entries, baseVelocity)
            : 0;
        return {bonus: bonus, hasFootwear: entries.length > 0};
    },
    getWeatherVelocityBonus: function (weather, baseVelocity) {
        if (!weather || typeof weather.getValue !== "function") {
            return 0;
        }
        return baseVelocity * weather.getValue("speed");
    },
    getEffectiveVelocity: function (storage, weather) {
        var baseVelocity = this.getBaseVelocity();
        var footwear = this.getFootwearVelocityBonus(storage, baseVelocity);
        return baseVelocity +
            this.getVehicleVelocityBonus(storage, baseVelocity) +
            footwear.bonus +
            this.getWeatherVelocityBonus(weather, baseVelocity);
    },
    getRouteModifiers: function (options) {
        var footwear = this.getFootwearVelocityBonus(options.storage);
        var hasBoots = footwear.hasFootwear;
        var accelerateRealTime = hasBoots
            ? this._footwearAccelerateRealTime(options.storage)
            : this.CONFIG.DEFAULT_ACCELERATE_REAL_TIME;
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
    _footwearAccelerateRealTime: function (storage) {
        var result = this.CONFIG.DEFAULT_ACCELERATE_REAL_TIME;
        var entries = this._collectTravelEntries(storage, "footwear");
        for (var i = 0; i < entries.length; i++) {
            if (typeof entries[i].travelAccelerateRealTime === "number" &&
                entries[i].travelAccelerateRealTime < result) {
                result = entries[i].travelAccelerateRealTime;
            }
        }
        return result;
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
    },
    buildRuntimePlan: function (overrides) {
        return this.buildPlan(GameRuntime.buildTravelOptions(overrides));
    }
};
