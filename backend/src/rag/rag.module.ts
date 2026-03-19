import { Module } from "@nestjs/common";
import { RagController } from "./rag.controller";
import { RagIngestionService } from "./rag-ingestion.service";
import { RagService } from "./rag.service";
import { SupabaseModule } from "../supabase/supabase.module";

@Module({
  imports: [SupabaseModule],
  controllers: [RagController],
  providers: [RagService, RagIngestionService],
  exports: [RagService],
})
export class RagModule {}
