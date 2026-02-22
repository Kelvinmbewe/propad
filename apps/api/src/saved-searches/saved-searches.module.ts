import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { SavedSearchesService } from "./saved-searches.service";
import { SavedSearchesController } from "./saved-searches.controller";

@Module({
  imports: [PrismaModule],
  controllers: [SavedSearchesController],
  providers: [SavedSearchesService],
  exports: [SavedSearchesService],
})
export class SavedSearchesModule {}
