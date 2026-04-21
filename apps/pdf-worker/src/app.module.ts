import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { BookletModule } from "./booklet/booklet.module";
import { HealthModule } from "./health/health.module";

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        url: process.env.REDIS_URL ?? "redis://localhost:6379",
      },
    }),
    BookletModule,
    HealthModule,
  ],
})
export class AppModule {}
