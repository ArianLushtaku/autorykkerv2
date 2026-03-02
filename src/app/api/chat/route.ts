import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { messages, systemPrompt } = await request.json()

    const openaiApiKey = process.env.OPENAI_API_KEY
    if (!openaiApiKey) {
      // Return fallback response if no API key
      return NextResponse.json({
        message: 'Tak for din besked! For at få det bedste svar, kontakt os på support@autorykker.dk. Vi svarer inden for 2 timer på hverdage.'
      })
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        max_tokens: 500,
        temperature: 0.7
      })
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('OpenAI API error:', error)
      return NextResponse.json({
        message: 'Beklager, jeg har tekniske problemer lige nu. Du kan kontakte os på support@autorykker.dk.'
      })
    }

    const data = await response.json()
    const assistantMessage = data.choices?.[0]?.message?.content

    if (!assistantMessage) {
      return NextResponse.json({
        message: 'Beklager, jeg kunne ikke generere et svar. Prøv igen eller kontakt support@autorykker.dk.'
      })
    }

    return NextResponse.json({ message: assistantMessage })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json({
      message: 'Der opstod en fejl. Kontakt os på support@autorykker.dk.'
    })
  }
}
