import { Injectable, Inject } from "@nestjs/common";
import * as ical from "ical";
import * as icalgenerator from "ical-generator";
import * as IORedis from "ioredis";
import Axios from "axios";

const EVENT_COMPONENT_KEY = "VEVENT";
const EXISTS_CACHE_EXP_SECONDS = 60 * 60 * 24; // 1 day

@Injectable()
export class CalendarService {
    constructor(
        @Inject(IORedis)
        private readonly _redisClient: IORedis.Redis,
    ) {}

    public getMeetupICalUrl = (groupName: string): string =>
        `https://www.meetup.com/${groupName}/events/ical/`;

    public getGroupCacheName = (groupName: string): string =>
        `GROUP_${groupName}`;

    public async checkMeetupGroupExists(groupName: string): Promise<boolean> {
        const cacheKey = this.getGroupCacheName(groupName);
        const redisResult = await this._redisClient.get(cacheKey);

        if (redisResult !== null) {
            return redisResult === "true";
        }

        try {
            await Axios.head(this.getMeetupICalUrl(groupName), {
                maxRedirects: 0,
            });
            await this._redisClient.setex(
                cacheKey,
                EXISTS_CACHE_EXP_SECONDS,
                "true",
            );

            return true;
        } catch (error) {
            await this._redisClient.setex(
                cacheKey,
                EXISTS_CACHE_EXP_SECONDS,
                "false",
            );

            return false;
        }
    }

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
