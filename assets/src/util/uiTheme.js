/**
 * UI主题配置
 */

var UITheme = {
    // 颜色配置
    colors: {
        WHITE: cc.color.WHITE,
        BLACK: cc.color.BLACK,
        RED: cc.color.RED,
        GREEN: cc.color.GREEN,
        BLUE: cc.color.BLUE,
        YELLOW: cc.color.YELLOW,
        GRAY: cc.color.GRAY,

        // 自定义颜色
        TEXT_NORMAL: cc.color.WHITE,
        TEXT_ERROR: cc.color.RED,
        TEXT_SUCCESS: cc.color.GREEN,
        TEXT_TITLE: cc.color(0, 0, 0, 255),

        MASK_DARK: cc.color(0, 0, 0, 155),
        MASK_DARKER: cc.color(0, 0, 0, 200),

        BG_TRANSPARENT: cc.color(0, 0, 0, 0)
    },

    /**
     * 获取颜色
     */
    getColor: function(colorName) {
        return this.colors[colorName] || cc.color.WHITE;
    }
};
