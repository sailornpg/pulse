import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { SupabaseService } from "../supabase/supabase.service";

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  parts: any;
  created_at: string;
}

@Injectable()
export class HistoryService {
  constructor(private supabase: SupabaseService) {}

  private async getClient(token?: string) {
    return token ? await this.supabase.getClientWithToken(token) : this.supabase.getClient();
  }

  async getConversations(userId: string, token?: string): Promise<Conversation[]> {
    const client = await this.getClient(token);
    const { data, error } = await client
      .from("conversations")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async createConversation(userId: string, title: string = "新对话", token?: string): Promise<Conversation> {
    const client = await this.getClient(token);
    
    console.log('[History] createConversation - userId:', userId, 'hasToken:', !!token);
    
    const { data, error } = await client
      .from("conversations")
      .insert({ user_id: userId, title })
      .select()
      .single();

    if (error) {
      console.error('[History] createConversation error:', error);
      throw error;
    }
    return data;
  }

  async getMessages(conversationId: string, userId: string, token?: string): Promise<Message[]> {
    const client = await this.getClient(token);
    
    const { data: conversation, error: convError } = await client
      .from("conversations")
      .select("user_id")
      .eq("id", conversationId)
      .single();

    if (convError || !conversation) {
      throw new NotFoundException("Conversation not found");
    }
    
    if (conversation.user_id !== userId) {
      throw new ForbiddenException("Not authorized to access this conversation");
    }
    
    const { data, error } = await client
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async addMessage(conversationId: string, userId: string, role: string, content: string, parts?: any, token?: string): Promise<Message> {
    const client = await this.getClient(token);
    
    const { data, error } = await client
      .from("messages")
      .insert({ conversation_id: conversationId, role, content, parts })
      .select()
      .single();

    if (error) {
      console.error("[History] 添加消息失败:", error);
      throw error;
    }

    await client
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId);

    return data;
  }

  async updateConversationTitle(conversationId: string, userId: string, title: string, token?: string): Promise<Conversation> {
    await this.verifyConversationOwner(conversationId, userId, token);

    const client = await this.getClient(token);
    const { data, error } = await client
      .from("conversations")
      .update({ title })
      .eq("id", conversationId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteConversation(conversationId: string, userId: string, token?: string): Promise<void> {
    await this.verifyConversationOwner(conversationId, userId, token);

    const client = await this.getClient(token);
    const { error } = await client
      .from("conversations")
      .delete()
      .eq("id", conversationId);

    if (error) throw error;
  }

  private async verifyConversationOwner(conversationId: string, userId: string, token?: string): Promise<void> {
    const client = await this.getClient(token);
    const { data, error } = await client
      .from("conversations")
      .select("user_id")
      .eq("id", conversationId)
      .single();

    if (error || !data) {
      throw new NotFoundException("Conversation not found");
    }
    
    if (data.user_id !== userId) {
      throw new ForbiddenException("Not authorized to access this conversation");
    }
  }
}
