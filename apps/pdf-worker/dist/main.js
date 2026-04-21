"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
async function bootstrap() {
    var _a;
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const port = (_a = process.env.PORT) !== null && _a !== void 0 ? _a : 3001;
    await app.listen(port);
    console.log(`PDF Worker listening on port ${port}`);
}
bootstrap();
//# sourceMappingURL=main.js.map