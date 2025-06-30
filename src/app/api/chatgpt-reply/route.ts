import { NextRequest, NextResponse } from 'next/server';

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  conversation: Message[];
  userMessage: string;
}

export async function POST(request: NextRequest) {
  try {
    const { conversation, userMessage }: ChatRequest = await request.json();
    
    if (!userMessage) {
      return NextResponse.json({ error: 'No user message provided' }, { status: 400 });
    }

    // Build the conversation history
    const messages: Message[] = [
      {
        role: 'system',
        content: 'あなたは優しく親切な顧客です。営業マンとの会話を想定して対応してください。'
      },
      ...conversation,
      {
        role: 'user',
        content: userMessage
      }
    ];

    // Send to OpenAI Chat Completion API
    const chatResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: messages,
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!chatResponse.ok) {
      const errorText = await chatResponse.text();
      console.error('ChatGPT API error:', errorText);
      return NextResponse.json({ error: 'ChatGPT API error' }, { status: 500 });
    }

    const chatResult = await chatResponse.json();
    const aiResponse = chatResult.choices[0]?.message?.content;

    if (!aiResponse) {
      return NextResponse.json({ error: 'No response from ChatGPT' }, { status: 500 });
    }

    return NextResponse.json({ 
      response: aiResponse,
      success: true 
    });

  } catch (error) {
    console.error('Error in chatgpt-reply:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

