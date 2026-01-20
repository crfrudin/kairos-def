// src/features/daily-plan/application/ports/ICalendarService.ts

import type { CalendarDate } from "../../domain/value-objects";

/**
 * “Agora” é PROIBIDO no domínio, mas permitido na application via abstração. :contentReference[oaicite:12]{index=12}
 */
export interface ICalendarService {
  today(): CalendarDate;
}
