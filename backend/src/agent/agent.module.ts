import { Module, forwardRef } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AgentService } from './agent.service';
import { AgentController } from './agent.controller';
import { SchedulerService } from './scheduler.service';
import { MemoryService } from './memory.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [ScheduleModule.forRoot(), SupabaseModule, forwardRef(() => AuthModule)],
  controllers: [AgentController],
  providers: [AgentService, SchedulerService, MemoryService],
  exports: [AgentService, MemoryService],
})
export class AgentModule {}
