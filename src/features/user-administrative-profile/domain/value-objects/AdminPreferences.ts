import { PreferredLanguage } from "./PreferredLanguage";
import { TimeZone } from "./TimeZone";

export type AdminPreferencesInput = {
  preferredLanguage?: string | null;
  timeZone?: string | null;
  communicationsConsent?: boolean | null;
};

export class AdminPreferences {
  private readonly _preferredLanguage: PreferredLanguage | null;
  private readonly _timeZone: TimeZone | null;
  private readonly _communicationsConsent: boolean | null;

  private constructor(props: {
    preferredLanguage: PreferredLanguage | null;
    timeZone: TimeZone | null;
    communicationsConsent: boolean | null;
  }) {
    this._preferredLanguage = props.preferredLanguage;
    this._timeZone = props.timeZone;
    this._communicationsConsent = props.communicationsConsent;
  }

  public static create(input: AdminPreferencesInput | null | undefined): AdminPreferences | null {
    if (!input) return null;

    const preferredLanguage = PreferredLanguage.create(input.preferredLanguage);
    const timeZone = TimeZone.create(input.timeZone);

    const communicationsConsent =
      input.communicationsConsent === undefined ? null : (input.communicationsConsent === null ? null : Boolean(input.communicationsConsent));

    const anyProvided = !!preferredLanguage || !!timeZone || communicationsConsent !== null;
    if (!anyProvided) return null;

    return new AdminPreferences({ preferredLanguage, timeZone, communicationsConsent });
  }

  public get preferredLanguage(): PreferredLanguage | null { return this._preferredLanguage; }
  public get timeZone(): TimeZone | null { return this._timeZone; }
  public get communicationsConsent(): boolean | null { return this._communicationsConsent; }

  public toPrimitives(): AdminPreferencesInput {
    return {
      preferredLanguage: this._preferredLanguage?.value ?? null,
      timeZone: this._timeZone?.value ?? null,
      communicationsConsent: this._communicationsConsent,
    };
  }
}
