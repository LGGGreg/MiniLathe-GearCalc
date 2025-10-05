import { PitchSetup } from './pitchSetup';
import LatheConfig from "./latheConfig";
import type TranslationsBase from '@/i18n/lang';
import { EnTranslations } from '@/i18n/lang';
import HuTranslations from '@/i18n/hu';
import { Storage } from './storage';

export default class GlobalConfig {
    private static _storage = new Storage();
    
    public static async loadAll() {
        await this.loadCombos();
        await this.loadConfig();
        await this.loadFavorites();
        await this.loadLanguage();
    }

// Config
    private static _config: LatheConfig;
    
    public static get config(): LatheConfig {
        return this._config;
    }

    public static set config(v: LatheConfig) {
        this._config = v;
        this.saveConfig();
    }

    private static async loadConfig(): Promise<LatheConfig> {
        try {
            const a = (await this._storage.getValue("latheConfig")) ?? "null";
            const b = JSON.parse(a!);
            this._config = LatheConfig.fromPlainObject(b);
        }
        catch{
            this._config = new LatheConfig();
        }
        return this._config;
    }

    private static saveConfig() {
        this._storage.setValue("latheConfig", JSON.stringify(this._config?.toPlainObject()));
    }

// Combos

    private static _combos: PitchSetup[];

    public static get combos(): PitchSetup[] {
        return this._combos;
    }

    public static set combos(v: PitchSetup[]) {
        this._combos = v;
        this.saveCombos();
    }

    private static async loadCombos(): Promise<PitchSetup[]> {
        try {
            const a = await this._storage.getValue("gearCombos")?? "null";
            const b = JSON.parse(a!);
            this._combos = (b as Array<any>).map(v => PitchSetup.fromPlainObject(v));
        } catch {
            this._combos = [];
        }
        return this._combos;
    }

    private static saveCombos() {
        this._storage.setValue("gearCombos", JSON.stringify(this._combos?.map(v => v.toPlainObject())));
    }

// Favorites

    private static _favorites: PitchSetup[];
    public static get favorites(): PitchSetup[] {
        return this._favorites;
    }

    public static addFavorite(s: PitchSetup) {
        // For named favorites (auto-favorites), check by name
        // For manual favorites, check by gear combination
        const existingIndex = s.name
            ? this.indexOfFavoriteByName(s.name)
            : this.indexOfFavorite(s);

        if(existingIndex == -1){
            this._favorites.push(s);
            this.saveFavorites();
        } else if (s.name) {
            // Update existing auto-favorite with better gear combination
            this._favorites[existingIndex] = s;
            this.saveFavorites();
        }
    }

    public static removeFavorite(s: PitchSetup) {
        const i = this.indexOfFavorite(s);
        if(i == -1) return;

        this._favorites = this._favorites.slice(0, i).concat(this._favorites.slice(i+1));
        this.saveFavorites();
    }

    public static isFavorite(s: PitchSetup) {
        return this.indexOfFavorite(s) >= 0;
    }

    private static saveFavorites() {
        this._storage.setValue("favorites", JSON.stringify(this._favorites.map(i => i.toPlainObject())))
    }

    private static async loadFavorites() {
        try {
            this._favorites = (JSON.parse(await this._storage.getValue("favorites") ?? "null") ?? [])
                .map((i: any) => PitchSetup.fromPlainObject(i));
        } catch {
            this._favorites = [];
        }
    }

    private static indexOfFavorite(s: PitchSetup): number{
        for (const i in this._favorites) {
            const f = this._favorites[i];
            if(f.equals(s))
                return Number(i);
        }
        return -1;
    }

    private static indexOfFavoriteByName(name: string): number{
        for (const i in this._favorites) {
            const f = this._favorites[i];
            if(f.name === name)
                return Number(i);
        }
        return -1;
    }

    /**
     * Recalculate all favorites with the current leadscrew pitch
     * This should be called when the leadscrew configuration changes
     */
    public static recalculateFavorites() {
        const leadscrew = this._config.leadscrew;
        this._favorites = this._favorites.map(fav => {
            // Recalculate pitch from gears and current leadscrew
            const recalculated = PitchSetup.fromGearsAndLeadscrew(
                fav.gearA,
                fav.gearB,
                fav.gearC,
                fav.gearD,
                leadscrew
            ).withName(fav.name);

            // Preserve the original pitch type (metric vs imperial)
            // If the original was metric, convert the recalculated pitch to metric
            if (fav.pitch.type != recalculated.pitch.type) {
                recalculated.pitch = recalculated.pitch.convert();
            }

            return recalculated;
        });
        this.saveFavorites();
    }

    /**
     * Clear all auto-favorites (favorites with names)
     * This allows them to be recalculated with the new optimizer
     */
    public static clearAutoFavorites() {
        // Remove favorites that have names (auto-favorites)
        this._favorites = this._favorites.filter(fav => !fav.name);
        this.saveFavorites();
    }

    /**
     * Clear ALL favorites (both auto and manual)
     * Used when recalculating everything from scratch
     */
    public static clearAllFavorites() {
        this._favorites = [];
        this.saveFavorites();
    }



// I18N

    private static _i18n: TranslationsBase;

    public static get i18n(): TranslationsBase {
        return this._i18n;
    };
    public static set i18n(value: TranslationsBase){
        this._i18n = value;
        this.saveLanguage();
        
        window.location.reload();
    }

    public static readonly availableLanguages: TranslationsBase[] = [
        new EnTranslations(),
        new HuTranslations(),
    ]

    private static async loadLanguage() : Promise<TranslationsBase>{
        const langCode = await this._storage.getValue("language");
        const x = this.availableLanguages.find(l => l.langCode == langCode);
        this._i18n = x ?? this.availableLanguages[0];
        return this._i18n;
    }

    private static saveLanguage(){
        this._storage.setValue("language", this.i18n.langCode);
    }
}