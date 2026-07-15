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
        warning: cc.color(72, 72, 72, 255),
        accent: cc.color(24, 24, 24, 255),
        muted: cc.color(126, 126, 126, 255),
        subtle: cc.color(96, 96, 96, 255),
        panelBorder: cc.color(168, 168, 168, 255),
        panelFill: cc.color(255, 255, 255, 255),
        panelFillAlt: cc.color(234, 234, 234, 255),
        lockedMask: cc.color(0, 0, 0, 160),
        divider: cc.color(178, 178, 178, 255)
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
            color: cc.color(0, 0, 0, 255)
        },
        sectionTitle: {
            fontSize: 26,
            color: cc.color(0, 0, 0, 255)
        },
        body: {
            fontSize: 20,
            color: cc.color(0, 0, 0, 255)
        },
        meta: {
            fontSize: 16,
            color: cc.color(112, 112, 112, 255)
        },
        caption: {
            fontSize: 16,
            color: cc.color(96, 96, 96, 255)
        },
        inverse: {
            fontSize: 16,
            color: cc.color(255, 255, 255, 255)
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
            blackTextColor: cc.color(255, 255, 255, 255),
            whiteTextColor: cc.color(0, 0, 0, 255),
            zoomOnTouchDown: false
        },
        small: {
            preferredSize: cc.size(86, 34),
            fontSize: 18
        }
    },
    // Pre-game secondary pages (shop / medal / choose): dark survival-diary shell.
    preGame: {
        background: cc.color(0, 0, 0, 255),
        panel: cc.color(8, 8, 8, 255),
        panelSoft: cc.color(18, 18, 18, 255),
        progressTrack: cc.color(20, 20, 20, 255),
        progressFill: cc.color(255, 255, 255, 255),
        points: cc.color(236, 200, 74, 255),
        border: cc.color(255, 255, 255, 196),
        borderStrong: cc.color(255, 255, 255, 255),
        divider: cc.color(255, 255, 255, 90),
        text: cc.color(255, 255, 255, 255),
        textSoft: cc.color(255, 255, 255, 220),
        textMuted: cc.color(255, 255, 255, 180),
        textFaint: cc.color(255, 255, 255, 120),
        pressedFill: cc.color(255, 255, 255, 32),
        headerTitleYOffset: 24,
        headerPointsYOffset: 54,
        headerDividerYOffset: 112,
        footerY: 62,
        footerButtonSize: cc.size(190, 52),
        footerButtonFontSize: 24
    },
    getColor: function (colorName) {
        return this.colors[colorName] || cc.color.WHITE;
    }
};
