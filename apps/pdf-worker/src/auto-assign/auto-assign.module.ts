import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { AutoAssignProcessor } from "./auto-assign.processor";

@Module({
  imports: [
    BullModule.registerQueue({
      name: "release-auto-assignment",
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 5000,
        },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    }),
  ],
  providers: [AutoAssignProcessor],
})
export class AutoAssignModule {}
