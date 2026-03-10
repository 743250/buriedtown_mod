export const SAVE_GAME_VERSION = 2;

export type SaveGameV2Envelope = {
    saveVersion: number;
    slot: number;
    createdAt: string;
    updatedAt: string;
    data: Record<string, any>;
    meta: Record<string, any>;
};

export const SaveGameV2 = {
    createEnvelope(slot: number, data: Record<string, any>, previousEnvelope?: Partial<SaveGameV2Envelope>): SaveGameV2Envelope {
        const now = new Date().toISOString();
        return {
            saveVersion: SAVE_GAME_VERSION,
            slot: slot,
            createdAt: previousEnvelope && previousEnvelope.createdAt ? previousEnvelope.createdAt : now,
            updatedAt: now,
            data: data || {},
            meta: previousEnvelope && previousEnvelope.meta ? previousEnvelope.meta : {}
        };
    },
    isEnvelope(value: any): boolean {
        return !!(value
            && typeof value === "object"
            && Number(value.saveVersion) === SAVE_GAME_VERSION
            && value.data
            && typeof value.data === "object");
    }
};
