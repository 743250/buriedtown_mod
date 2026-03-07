/**
 * 属性管理器
 * 封装属性的编码/解码和边界检查逻辑
 */

var PropertyManager = cc.Class.extend({
    ctor: function(initValue, maxValue) {
        this._value = memoryUtil.encode(initValue);
        this._max = memoryUtil.encode(maxValue);
    },

    get: function() {
        return memoryUtil.decode(this._value);
    },

    set: function(val) {
        this._value = memoryUtil.encode(Math.max(0, Math.min(val, this.getMax())));
    },

    getMax: function() {
        return memoryUtil.decode(this._max);
    },

    setMax: function(val) {
        this._max = memoryUtil.encode(val);
    },

    add: function(delta) {
        this.set(this.get() + delta);
    },

    getRaw: function() {
        return this._value;
    },

    setRaw: function(encodedVal) {
        this._value = encodedVal;
    },

    save: function() {
        return memoryUtil.decode(this._value);
    },

    restore: function(val) {
        this._value = memoryUtil.encode(val);
    }
});
