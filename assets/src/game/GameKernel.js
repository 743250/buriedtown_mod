/**
 * Minimal service registry for high-value runtime services.
 * Files should resolve optional gameplay services through this kernel instead
 * of depending on implicit script load order.
 */
var GameKernel = {
    _services: {},
    reset: function () {
        this._services = {};
        return this;
    },
    register: function (name, service) {
        if (!name || !service) {
            return null;
        }
        this._services[name] = service;
        return service;
    },
    configure: function (services) {
        var self = this;
        services = services || {};
        Object.keys(services).forEach(function (name) {
            self.register(name, services[name]);
        });
        return this;
    },
    has: function (name) {
        return !!(name && this._services && this._services[name]);
    },
    get: function (name) {
        if (!name || !this._services) {
            return null;
        }
        return this._services[name] || null;
    },
    require: function (name, consumerName) {
        var service = this.get(name);
        if (service) {
            return service;
        }
        throw new Error((consumerName || "GameKernel") + " requires service: " + name);
    }
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = GameKernel;
}
