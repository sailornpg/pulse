import { Module } from '@nestjs/common';
import { ChatModule } from './chat/chat.module';
import { AuthModule } from './auth/auth.module';
import { HistoryModule } from './history/history.module';
import { AgentModule } from './agent/agent.module';

@Module({
  imports: [ChatModule, AuthModule, HistoryModule, AgentModule],
})
export class AppModule {}
