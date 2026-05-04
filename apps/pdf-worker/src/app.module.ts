import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { AutoAssignModule } from "./auto-assign/auto-assign.module";
import { BookletModule } from "./booklet/booklet.module";
import { HealthModule } from "./health/health.module";

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        url: process.env.REDIS_URL ?? "redis://localhost:6379",
      },
    }),
    AutoAssignModule,
    BookletModule,
    HealthModule,
  ],
})
export class AppModule {}
