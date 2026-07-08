/**
 * Created by LVWC on 15/8/17.
 */

var memoryUtil = {};
memoryUtil.mult = utils.getRandomInt(1, 9);
memoryUtil.adds = utils.getRandomInt(1, 9);
memoryUtil.encode = function (num) {
    return this.mult * num + this.adds;
};
memoryUtil.decode = function (num) {
    return (num - this.adds) / this.mult;
};
memoryUtil.changeEncode = function (num) {
    return this.mult * num;
};
memoryUtil.changeDecode = function (num) {
    return num / this.mult;
};

