/**
 * Centralized access point for runtime singletons that historically lived on
 * globals. New runtime-facing code should depend on this adapter first and let
 * it bridge to legacy globals when needed.
 */
var GameRuntime = {
    _state: {
        player: null,
        timer: null,
        emitter: null,
        record: null
    },
    _getRoot: function () {
        if (typeof globalThis !== "undefined") {
            return globalThis;
        }
        if (typeof window !== "undefined") {
            return window;
        }
        if (typeof global !== "undefined") {
            return global;
        }
        return this;
    },
    reset: function () {
        this._state.player = null;
        this._state.timer = null;
        this._state.emitter = null;
        this._state.record = null;
        return this;
    },
    bootstrap: function (options) {
        this.reset();
        return this.configure(options);
    },
    configure: function (options) {
        options = options || {};
        if (options.hasOwnProperty("record")) {
            this.setRecord(options.record);
        }
        if (options.hasOwnProperty("emitter")) {
            this.setEmitter(options.emitter);
        }
        if (options.hasOwnProperty("timer")) {
            this.setTimer(options.timer);
        }
        if (options.hasOwnProperty("player")) {
            this.setPlayer(options.player);
        }
        return this;
    },
    setPlayer: function (playerInstance) {
        this._state.player = playerInstance || null;
        this._getRoot().player = playerInstance || null;
        return this._state.player;
    },
    getPlayer: function () {
        if (this._state.player) {
            return this._state.player;
        }
        return typeof player !== "undefined" ? player : null;
    },
    setTimer: function (timerInstance) {
        this._state.timer = timerInstance || null;
        if (typeof cc !== "undefined" && cc) {
            cc.timer = timerInstance || null;
        }
        return this._state.timer;
    },
    getTimer: function () {
        if (this._state.timer) {
            return this._state.timer;
        }
        if (typeof cc !== "undefined" && cc && cc.timer) {
            return cc.timer;
        }
        return null;
    },
    setEmitter: function (emitterInstance) {
        this._state.emitter = emitterInstance || null;
        if (typeof utils !== "undefined" && utils) {
            utils.emitter = emitterInstance || null;
        }
        return this._state.emitter;
    },
    getEmitter: function () {
        if (this._state.emitter) {
            return this._state.emitter;
        }
        if (typeof utils !== "undefined" && utils && utils.emitter) {
            return utils.emitter;
        }
        return null;
    },
    setRecord: function (recordInstance) {
        this._state.record = recordInstance || null;
        return this._state.record;
    },
    getRecord: function () {
        if (this._state.record) {
            return this._state.record;
        }
        return typeof Record !== "undefined" ? Record : null;
    },
    buildTravelOptions: function (overrides) {
        overrides = overrides || {};
        var runtimePlayer = this.getPlayer();
        var map = runtimePlayer ? runtimePlayer.map : null;
        var currentEntity = runtimePlayer && typeof runtimePlayer.getCurrentMapEntityId === "function"
            ? runtimePlayer.getCurrentMapEntityId()
            : 0;

        return {
            startPos: overrides.startPos || (map ? map.pos : null),
            endPos: overrides.endPos || null,
            currentSiteId: overrides.currentSiteId || currentEntity,
            currentEntityKey: overrides.currentEntityKey
                || (runtimePlayer && typeof runtimePlayer.getCurrentMapEntityKey === "function"
                    ? runtimePlayer.getCurrentMapEntityKey()
                    : null),
            destinationSite: overrides.destinationSite || null,
            destinationEntity: overrides.destinationEntity || null,
            map: overrides.map || map,
            roleType: overrides.roleType || (runtimePlayer ? runtimePlayer.roleType : null),
            ziplineNetwork: overrides.ziplineNetwork || (runtimePlayer ? runtimePlayer.ziplineNetwork : null),
            storage: overrides.storage || (runtimePlayer ? runtimePlayer.storage : null),
            weather: overrides.weather || (runtimePlayer ? runtimePlayer.weather : null)
        };
    }
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = GameRuntime;
}
