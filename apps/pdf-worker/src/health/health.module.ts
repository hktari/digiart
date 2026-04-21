import { Controller, Get } from "@nestjs/common";
import { Module } from "@nestjs/common";

@Controller("health")
class HealthController {
  @Get()
  check() {
    return { status: "ok" };
  }
}

@Module({ controllers: [HealthController] })
export class HealthModule {}
