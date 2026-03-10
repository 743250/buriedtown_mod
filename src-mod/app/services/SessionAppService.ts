import { LegacyRouter } from "../../router/LegacyRouter";
import { getGlobalScope } from "../../shared/global";
import { NavigationAppService } from "./NavigationAppService";

export class SessionAppService {
    private router: LegacyRouter;
    private navigation: NavigationAppService | null;

    constructor(router: LegacyRouter, navigation?: NavigationAppService | null) {
        this.router = router;
        this.navigation = navigation || null;
    }

    private stopActiveMusic(): void {
        const globalScope = getGlobalScope();
        if (this.navigation && typeof this.navigation.stopMusic === "function") {
            this.navigation.stopMusic();
            return;
        }
        if (globalScope.audioManager && typeof globalScope.audioManager.stopMusic === "function") {
            globalScope.audioManager.stopMusic(globalScope.audioManager.music && globalScope.audioManager.music.MAIN_PAGE);
        }
    }

    initRuntime(): any {
        const globalScope = getGlobalScope();
        if (globalScope.Record && typeof globalScope.Record.init === "function") {
            globalScope.Record.init(globalScope.Record.getCurrentRecordName());
        }
        if (this.navigation && typeof this.navigation.init === "function") {
            this.navigation.init();
        } else if (globalScope.Navigation && typeof globalScope.Navigation.init === "function") {
            globalScope.Navigation.init();
        }
        if (globalScope.utils && globalScope.utils.emitter) {
            globalScope.utils.emitter.removeAllListeners();
        }
        if (globalScope.utils && typeof globalScope.Emitter === "function") {
            globalScope.utils.emitter = new globalScope.Emitter();
        }
        if (globalScope.cc && typeof globalScope.TimerManager === "function") {
            globalScope.cc.timer = new globalScope.TimerManager();
        }
        if (typeof globalScope.Player === "function") {
            globalScope.player = new globalScope.Player();
        }
        if (globalScope.player && typeof globalScope.player.restore === "function") {
            globalScope.player.restore();
        }
        if (globalScope.userGuide && typeof globalScope.userGuide.init === "function") {
            globalScope.userGuide.init();
        }
        if (globalScope.Medal && typeof globalScope.Medal.initCompletedForOneGame === "function") {
            globalScope.Medal.initCompletedForOneGame(false);
        }
        if (globalScope.Record
            && typeof globalScope.Record.restore === "function"
            && !globalScope.Record.restore("randomPack")
            && typeof globalScope.Record.save === "function"
            && globalScope.utils
            && typeof globalScope.utils.getRandomInt === "function") {
            globalScope.Record.save("randomPack", globalScope.utils.getRandomInt(1, 2));
        }
        return globalScope.player || null;
    }

    startRuntime(): void {
        const globalScope = getGlobalScope();
        if (globalScope.player && typeof globalScope.player.start === "function") {
            globalScope.player.start();
        }
        if (globalScope.IAPPackage
            && typeof globalScope.IAPPackage.applyActiveTalentStartGifts === "function"
            && globalScope.player) {
            const gifted = globalScope.IAPPackage.applyActiveTalentStartGifts(globalScope.player);
            if (gifted
                && globalScope.Record
                && typeof globalScope.Record.saveAll === "function") {
                globalScope.Record.saveAll();
            }
        }
    }

    stopRuntime(): void {
        const globalScope = getGlobalScope();
        if (globalScope.cc && globalScope.cc.timer) {
            globalScope.cc.timer.stop();
        }
    }

    prepareNewGame(): void {
        const globalScope = getGlobalScope();
        if (globalScope.Record && typeof globalScope.Record.deleteRecord === "function") {
            globalScope.Record.deleteRecord(globalScope.Record.getCurrentRecordName());
        }
        if (globalScope.Record && typeof globalScope.Record.setType === "function") {
            globalScope.Record.setType(-1);
        }
        if (globalScope.IAPPackage && typeof globalScope.IAPPackage.resetConsumeIAP === "function") {
            globalScope.IAPPackage.resetConsumeIAP();
        }
        if (globalScope.Medal && typeof globalScope.Medal.newGameReset === "function") {
            globalScope.Medal.newGameReset();
        }
        if (globalScope.Medal && typeof globalScope.Medal.initCompletedForOneGame === "function") {
            globalScope.Medal.initCompletedForOneGame(true);
        }
    }

    reliveRuntime(): void {
        const globalScope = getGlobalScope();
        this.initRuntime();
        this.startRuntime();
        if (globalScope.player && typeof globalScope.player.relive === "function") {
            globalScope.player.relive();
        }
    }

    startNewGame(slot: number): void {
        const globalScope = getGlobalScope();
        if (globalScope.Record && typeof globalScope.Record.setCurrentSlot === "function") {
            globalScope.Record.setCurrentSlot(slot);
        }
        this.stopActiveMusic();
        if (globalScope.DataLog && typeof globalScope.DataLog.increaseRound === "function") {
            globalScope.DataLog.increaseRound();
        }
        this.prepareNewGame();
        this.router.runScene("ChooseScene");
    }

    continueGame(slot: number): void {
        const globalScope = getGlobalScope();
        if (globalScope.Record && typeof globalScope.Record.setCurrentSlot === "function") {
            globalScope.Record.setCurrentSlot(slot);
        }
        this.stopActiveMusic();
        this.initRuntime();
        this.startRuntime();
        this.router.runScene("MainScene");
    }

    relive(): void {
        this.reliveRuntime();
    }

    saveAll(): void {
        const globalScope = getGlobalScope();
        if (globalScope.Record && typeof globalScope.Record.saveAll === "function") {
            globalScope.Record.saveAll();
        }
    }
}
