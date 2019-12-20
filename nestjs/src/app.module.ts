import { Module } from "@nestjs/common";

import { CalendarController } from "./controllers";
import { CalendarService } from "./services";

import * as IORedis from "ioredis";

@Module({
    imports: [],
    controllers: [CalendarController],
    providers: [
        CalendarService,
        {
            provide: IORedis,
            useValue: new IORedis({
                host: "localhost",
                port: 6379,
            }),
        },
    ],
})
export class AppModule {}
