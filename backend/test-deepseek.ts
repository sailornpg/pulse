import 'dotenv/config';
import { createDeepSeek } from '@ai-sdk/deepseek';
import { streamText } from 'ai';

async function testDeepSeek() {
  console.log('开始测试 DeepSeek API (streamText)...');
  
  const deepseek = createDeepSeek();
  console.log('DeepSeek provider 创建成功');
  
  try {
    const result = streamText({
      model: deepseek('deepseek-chat'),
      messages: [{ role: 'user', content: '你好' }],
    });
    
    console.log('✅ streamText 创建成功!');
    
    // 尝试获取一些数据
    let fullText = '';
    for await (const part of result.textStream) {
      fullText += part;
    }
    console.log('回复:', fullText);
  } catch (error) {
    console.error('❌ DeepSeek API 调用失败:');
    console.error(error);
  }
}

testDeepSeek();
