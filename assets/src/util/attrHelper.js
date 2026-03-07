/**
 * 属性操作辅助工具
 * 简化常见的属性操作模式
 */

var AttrHelper = {
    /**
     * 获取属性值
     */
    get: function(obj, key) {
        return memoryUtil.decode(obj[key]);
    },

    /**
     * 设置属性值（带边界检查）
     */
    set: function(obj, key, value) {
        var max = memoryUtil.decode(obj[key + "Max"]);
        obj[key] = memoryUtil.encode(Math.max(0, Math.min(value, max)));
    },

    /**
     * 修改属性值（增量）
     */
    change: function(obj, key, delta) {
        var current = this.get(obj, key);
        this.set(obj, key, current + delta);
    },

    /**
     * 获取属性百分比
     */
    getPercentage: function(obj, key) {
        return this.get(obj, key) / this.get(obj, key + "Max");
    },

    /**
     * 检查属性是否已满
     */
    isMax: function(obj, key) {
        return this.get(obj, key) === this.get(obj, key + "Max");
    },

    /**
     * 批量保存属性
     */
    saveAttrs: function(obj, keys) {
        var result = {};
        keys.forEach(function(key) {
            result[key] = AttrHelper.get(obj, key);
            if (obj[key + "Max"]) {
                result[key + "Max"] = AttrHelper.get(obj, key + "Max");
            }
        });
        return result;
    },

    /**
     * 批量恢复属性
     */
    restoreAttrs: function(obj, data, keys) {
        keys.forEach(function(key) {
            if (data[key] !== undefined) {
                obj[key] = memoryUtil.encode(data[key]);
            }
            if (data[key + "Max"] !== undefined) {
                obj[key + "Max"] = memoryUtil.encode(data[key + "Max"]);
            }
        });
    }
};
