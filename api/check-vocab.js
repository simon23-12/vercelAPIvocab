export default async function handler(req, res) {
  console.log('=== REQUEST START ===');
  console.log('Method:', req.method);
  console.log('Body:', JSON.stringify(req.body));
  
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    console.log('OPTIONS request, returning 200');
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    console.log('Not POST, returning 405');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { german, correct, userAnswer } = req.body;
    console.log('Parsed:', { german, correct, userAnswer });
    
    if (!german || !correct || !userAnswer) {
      console.log('Missing params!');
      return res.status(400).json({ error: 'Missing parameters' });
    }
    
    // Check API Key
    const hasKey = !!process.env.ANTHROPIC_KEY2;
    console.log('Has ANTHROPIC_KEY2:', hasKey);
    
    if (!hasKey) {
      console.error('ANTHROPIC_KEY2 not set!');
      return res.status(500).json({ error: 'API key not configured' });
    }
    
    console.log('Calling Anthropic API...');
    
    const anthropicRequest = {
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 10,
      messages: [{
        role: 'user',
        content: `Is "${userAnswer}" a correct English translation of "${german}"? Expected: "${correct}". Reply ONLY "CORRECT" or "WRONG".`
      }]
    };
    
    console.log('Anthropic request:', JSON.stringify(anthropicRequest));
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_KEY2,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(anthropicRequest)
    });
    
    console.log('Anthropic status:', response.status);
    
    const responseText = await response.text();
    console.log('Anthropic raw response:', responseText);
    
    if (!response.ok) {
      console.error('Anthropic error:', response.status);
      return res.status(500).json({ 
        error: 'Anthropic API failed', 
        status: response.status,
        details: responseText 
      });
    }
    
    let data;
    try {
      data = JSON.parse(responseText);
      console.log('Parsed data:', JSON.stringify(data));
    } catch (e) {
      console.error('JSON parse error:', e.message);
      return res.status(500).json({ error: 'Invalid JSON response' });
    }
    
    if (!data.content || !data.content[0]) {
      console.error('Missing content in response');
      return res.status(500).json({ error: 'Invalid response structure', data });
    }
    
    const aiResponse = data.content[0].text.trim();
    const isCorrect = aiResponse.toUpperCase().includes('CORRECT');
    
    console.log('Final result:', { aiResponse, isCorrect });
    console.log('=== REQUEST END ===');
    
    return res.status(200).json({ isCorrect, aiResponse });
    
  } catch (error) {
    console.error('=== EXCEPTION ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    return res.status(500).json({ 
      error: error.message,
      stack: error.stack 
    });
  }
}
