import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { SentryGlobalFilter, SentryModule } from "@sentry/nestjs/setup";
import { AutoAssignModule } from "./auto-assign/auto-assign.module";
import { BookletModule } from "./booklet/booklet.module";
import { HealthModule } from "./health/health.module";

@Module({
  imports: [
    SentryModule.forRoot(),
    BullModule.forRoot({
      connection: {
        url: process.env.REDIS_URL ?? "redis://localhost:6379",
      },
    }),
    AutoAssignModule,
    BookletModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: SentryGlobalFilter,
    },
  ],
})
export class AppModule {}
