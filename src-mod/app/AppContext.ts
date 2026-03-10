import { SessionAppService } from "./services/SessionAppService";
import { WorldAppService } from "./services/WorldAppService";
import { TravelAppService } from "./services/TravelAppService";
import { CombatAppService } from "./services/CombatAppService";
import { NavigationAppService } from "./services/NavigationAppService";
import { CommerceAppService } from "./services/CommerceAppService";
import { AssetResolver } from "../ui/AssetResolver";
import { PlatformFacade } from "../platform/PlatformFacade";
import { LegacyMusicPolicy, LegacyRouter, LegacyScreenFactory } from "../router/LegacyRouter";
import { getGlobalScope } from "../shared/global";

export type LegacyAppContext = {
    services: Record<string, any>;
    stores: Record<string, any>;
    platform: PlatformFacade;
    router: LegacyRouter;
    eventBus: any;
    assets: AssetResolver;
    legacy: Record<string, any>;
    metadata: Record<string, any>;
};

export function createAppContext(assetResolver: AssetResolver, metadata: Record<string, any>): LegacyAppContext {
    const globalScope = getGlobalScope();
    const screenFactory = new LegacyScreenFactory();
    const musicPolicy = new LegacyMusicPolicy();
    const router = new LegacyRouter(screenFactory, musicPolicy);
    const platform = new PlatformFacade();
    const navigationService = new NavigationAppService(screenFactory, musicPolicy, globalScope.Navigation ? globalScope.Navigation.nodeName : {});
    const sessionService = new SessionAppService(router, navigationService);

    return {
        services: {
            session: sessionService,
            world: new WorldAppService(),
            travel: new TravelAppService(),
            combat: new CombatAppService(),
            navigation: navigationService,
            commerce: new CommerceAppService()
        },
        stores: {
            get player() {
                return globalScope.player || null;
            },
            get game() {
                return globalScope.game || null;
            },
            get navigation() {
                return globalScope.Navigation || null;
            },
            get record() {
                return globalScope.Record || null;
            }
        },
        platform: platform,
        router: router,
        eventBus: globalScope.utils ? globalScope.utils.emitter : null,
        assets: assetResolver,
        legacy: {
            get player() {
                return globalScope.player || null;
            },
            get game() {
                return globalScope.game || null;
            },
            get navigation() {
                return globalScope.Navigation || null;
            }
        },
        metadata: metadata
    };
}
