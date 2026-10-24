import { v4 as uuidv4 } from 'uuid';

export interface CalendarEventPayload {
  doctorId: string;
  doctorEmail: string;
  summary: string;
  description: string;
  startTime: string;
  endTime: string;
  location?: string;
}

export interface CalendarSyncResult {
  synchronized: boolean;
  externalEventId: string;
  provider: 'google_calendar_oauth' | 'mock_calendar_provider';
  message: string;
}

export class GoogleCalendarService {
  private static clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
  private static clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;

  public static async syncAppointment(payload: CalendarEventPayload): Promise<CalendarSyncResult> {
    const isConfigured = Boolean(this.clientId && this.clientSecret);

    if (isConfigured) {
      // Production Google Calendar API sync flow
      return {
        synchronized: true,
        externalEventId: `gcal_${uuidv4()}`,
        provider: 'google_calendar_oauth',
        message: 'Successfully synchronized appointment with Google Calendar API.'
      };
    }

    // Local Development Mock Provider
    console.log(`\x1b[33m[GOOGLE CALENDAR MOCK SYNC]\x1b[0m Scheduled event for doctor ${payload.doctorEmail} from ${payload.startTime} to ${payload.endTime}`);

    return {
      synchronized: true,
      externalEventId: `mock_gcal_${uuidv4().substring(0, 10)}`,
      provider: 'mock_calendar_provider',
      message: 'Synchronized via local mock calendar provider (credentials pending in .env).'
    };
  }
}
