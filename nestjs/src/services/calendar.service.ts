import { Injectable, Inject } from "@nestjs/common";
import * as ical from "ical";
import * as icalgenerator from "ical-generator";
import * as IORedis from "ioredis";

const EVENT_COMPONENT_KEY = "VEVENT";

@Injectable()
export class CalendarService {
    constructor(
        @Inject(IORedis)
        private readonly _redisClient: IORedis.Redis,
    ) {}
    /**
     * Pulls a remote ical and returns the parsed result.
     * @param url - URL of the ical to grab
     */
    public getCalendarFromUrl(url: string): Promise<ical.FullCalendar> {
        return new Promise((resolve, reject) => {
            ical.fromURL(url, {}, (err, data) =>
                err ? reject(err) : resolve(data),
            );
        });
    }

    /**
     * Merges events of multiple calendars and returns the result as string.
     * @param calendars - Calendars to merge events
     */
    public mergeEventsToString(calendars: ical.FullCalendar[]): string {
        const result = icalgenerator();

        for (const calendar of calendars) {
            for (const prop in calendar) {
                if (!calendar.hasOwnProperty(prop)) {
                    continue;
                }

                const component = calendar[prop];
                if (component.type === EVENT_COMPONENT_KEY) {
                    result.createEvent({
                        start: component.start,
                        summary: component.description,
                        end: component.end,
                        location: component.location,
                    });
                }
            }
        }

        return result.toString();
    }
}
