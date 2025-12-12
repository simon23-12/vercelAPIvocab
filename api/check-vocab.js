export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { german, correct, userAnswer } = req.body;
    
    // Validation
    if (!german || !correct || !userAnswer) {
      return res.status(400).json({ error: 'Missing parameters' });
    }
    
    // Check API Key
    if (!process.env.ANTHROPIC_KEY2) {
      console.error('ANTHROPIC_KEY2 is not set!');
      return res.status(500).json({ error: 'API key not configured' });
    }
    
    console.log('Calling Anthropic API...');
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_KEY2,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 10,
        messages: [{
          role: 'user',
          content: `Is "${userAnswer}" a correct English translation of "${german}"? Expected: "${correct}". Reply ONLY "CORRECT" or "WRONG".`
        }]
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Anthropic API error:', response.status, errorText);
      return res.status(500).json({ 
        error: 'Anthropic API failed', 
        status: response.status,
        details: errorText 
      });
    }
    
    const data = await response.json();
    console.log('Anthropic response:', JSON.stringify(data));
    
    if (!data.content || !data.content[0] || !data.content[0].text) {
      console.error('Unexpected API response structure:', data);
      return res.status(500).json({ error: 'Invalid API response' });
    }
    
    const aiResponse = data.content[0].text.trim();
    const isCorrect = aiResponse.toUpperCase().includes('CORRECT');
    
    console.log('Result:', { aiResponse, isCorrect });
    
    return res.status(200).json({ isCorrect, aiResponse });
    
  } catch (error) {
    console.error('Handler error:', error);
    return res.status(500).json({ 
      error: error.message,
      stack: error.stack 
    });
  }
}
