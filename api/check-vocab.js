export default async function handler(req, res) {
  // CORS erlauben
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const { german, correct, userAnswer } = req.body;
  
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 10,
        messages: [{
          role: 'user',
          content: `Is this English translation correct?

German: "${german}"
Correct: "${correct}"
Student: "${userAnswer}"

Reply ONLY "CORRECT" or "WRONG".`
        }]
      })
    });
    
    const data = await response.json();
    const aiResponse = data.content[0].text.trim().toUpperCase();
    const isCorrect = aiResponse.includes('CORRECT');
    
    res.json({ isCorrect, aiResponse });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
