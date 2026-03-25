/**
 * Shared UI theme tokens used by legacy scenes and newer extracted helpers.
 * Keep this file data-oriented so uiUtil/dialog/helpers can consume one source.
 */
var UITheme = {
    colors: {
        WHITE: cc.color.WHITE,
        BLACK: cc.color.BLACK,
        RED: cc.color.RED,
        GREEN: cc.color.GREEN,
        BLUE: cc.color.BLUE,
        YELLOW: cc.color.YELLOW,
        GRAY: cc.color.GRAY,

        TEXT_NORMAL: cc.color.WHITE,
        TEXT_ERROR: cc.color.RED,
        TEXT_SUCCESS: cc.color.GREEN,
        TEXT_BUFF: cc.color(0, 0, 0, 255),
        TEXT_TITLE: cc.color(0, 0, 0, 255),

        MASK_DARK: cc.color(0, 0, 0, 155),
        MASK_DARKER: cc.color(0, 0, 0, 200),

        BG_TRANSPARENT: cc.color(0, 0, 0, 0)
    },
    statusColors: {
        warning: cc.color(178, 92, 24, 255),
        accent: cc.color(96, 54, 16, 255),
        muted: cc.color(96, 88, 78, 255),
        subtle: cc.color(90, 82, 72, 255),
        panelBorder: cc.color(128, 110, 88, 255),
        panelFill: cc.color(255, 248, 236, 255),
        panelFillAlt: cc.color(247, 238, 224, 255),
        lockedMask: cc.color(0, 0, 0, 160),
        divider: cc.color(196, 184, 166, 255)
    },
    spacing: {
        XXS: 4,
        XS: 8,
        SM: 12,
        MD: 16,
        LG: 24,
        XL: 32,
        XXL: 40
    },
    typographyPresets: {
        title: {
            fontSize: 32,
            color: cc.color(28, 22, 14, 255)
        },
        sectionTitle: {
            fontSize: 26,
            color: cc.color(40, 32, 20, 255)
        },
        body: {
            fontSize: 20,
            color: cc.color(54, 44, 30, 255)
        },
        meta: {
            fontSize: 16,
            color: cc.color(96, 88, 78, 255)
        },
        caption: {
            fontSize: 16,
            color: cc.color(90, 82, 72, 255)
        },
        inverse: {
            fontSize: 16,
            color: cc.color(245, 239, 228, 255)
        }
    },
    dialog: {
        maskOpacity: 200,
        leftEdge: 24,
        titleWidth: 340,
        titleYOffset: -2,
        titleIconGap: 6,
        titleMetaGap: 35,
        actionButtonScale: 0.94,
        actionLayout: {
            one: [0.5],
            two: [0.25, 0.75],
            three: [0.18, 0.5, 0.82]
        }
    },
    cards: {
        panelOpacity: 88,
        rowOpacity: 84,
        shadowOpacity: 22,
        borderOpacity: 180,
        iconInset: 18,
        titleGap: 8,
        contentGap: 12
    },
    buttons: {
        common: {
            preferredSize: cc.size(178, 62),
            fontSize: 28,
            disabledColor: cc.color(136, 136, 136, 255),
            blackTextColor: cc.color(245, 239, 228, 255),
            whiteTextColor: cc.color(46, 34, 20, 255),
            zoomOnTouchDown: false
        },
        small: {
            preferredSize: cc.size(86, 34),
            fontSize: 18
        }
    },
    getColor: function (colorName) {
        return this.colors[colorName] || cc.color.WHITE;
    }
};
