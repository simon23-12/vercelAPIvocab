export default async function handler(req, res) {
  console.log('=== REQUEST START ===');
  console.log('Method:', req.method);
  console.log('Body:', JSON.stringify(req.body));
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    console.log('OPTIONS request, returning 200');
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
    
    console.log('Calling Anthropic with:', { german, correct, userAnswer });
    
    // BESSERER PROMPT - akzeptiert Synonyme!
    const prompt = `You are an English teacher checking a student's vocabulary translation.

German word/phrase: "${german}"
Expected English translation: "${correct}"
Student's answer: "${userAnswer}"

Are these translations equivalent? Consider:
- Synonyms are acceptable (e.g., "athletic" = "sporty")
- Minor grammatical variations are acceptable (e.g., "to be" vs "be")
- The meaning should be the same

Reply with ONLY ONE WORD: either "CORRECT" or "WRONG"`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_KEY2,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 20,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    });
    
    const responseText = await response.text();
    console.log('Anthropic status:', response.status);
    console.log('Anthropic response:', responseText);
    
    if (!response.ok) {
      return res.status(500).json({ 
        error: 'Anthropic API failed', 
        details: responseText 
      });
    }
    
    const data = JSON.parse(responseText);
    const aiResponse = data.content[0].text.trim();
    const isCorrect = aiResponse.toUpperCase().includes('CORRECT');
    
    console.log('Result:', { aiResponse, isCorrect });
    
    return res.status(200).json({ isCorrect, aiResponse });
    
  } catch (error) {
    console.error('Error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
