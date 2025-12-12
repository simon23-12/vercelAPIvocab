export default async function handler(req, res) {
  console.log('=== REQUEST START ===');
  
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
    
    if (!german || !correct || !userAnswer) {
      return res.status(400).json({ error: 'Missing parameters' });
    }
    
    if (!process.env.ANTHROPIC_KEY2) {
      return res.status(500).json({ error: 'API key not configured' });
    }
    
    console.log('Checking:', { german, correct, userAnswer });
    
    // SEHR LIBERALER PROMPT - akzeptiert fast alles was Sinn macht
    const prompt = `You are a friendly English teacher. A student is learning vocabulary.

German: "${german}"
Expected answer: "${correct}"
Student wrote: "${userAnswer}"

Question: Does the student's answer mean basically the same thing?

Important rules:
- Accept ALL synonyms (religious = faithful, athletic = sporty, etc.)
- Accept minor word order differences
- Accept "to" with or without infinitives
- Accept British vs American spelling
- Be LENIENT - if it's close enough, accept it!

Answer ONLY with the word "CORRECT" or "WRONG".`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_KEY2,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 50,
        temperature: 0.3,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    });
    
    const responseText = await response.text();
    console.log('Anthropic:', response.status, responseText);
    
    if (!response.ok) {
      return res.status(500).json({ error: 'API failed', details: responseText });
    }
    
    const data = JSON.parse(responseText);
    const aiResponse = data.content[0].text.trim();
    const isCorrect = aiResponse.toUpperCase().includes('CORRECT');
    
    console.log('=> Result:', aiResponse, '=', isCorrect);
    
    return res.status(200).json({ isCorrect, aiResponse });
    
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
