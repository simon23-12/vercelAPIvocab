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
    const { german, correct, userAnswer, strictMode } = req.body;
    
    if (!german || !correct || !userAnswer) {
      return res.status(400).json({ error: 'Missing parameters' });
    }
    
    if (!process.env.ANTHROPIC_KEY2) {
      return res.status(500).json({ error: 'API key not configured' });
    }
    
    console.log('Checking:', { german, correct, userAnswer, strictMode });
    
    // STRENGER PROMPT - Tippfehler = falsch, nur echte Synonyme akzeptiert
    const prompt = `You are a strict English vocabulary teacher grading a test.

German word: "${german}"
Correct English answer: "${correct}"
Student wrote: "${userAnswer}"

Question: Is the student's answer EXACTLY correct?

STRICT RULES:
1. Spelling must be PERFECT - even one wrong letter = WRONG
   - "whistel" is WRONG (correct: "whistle")
   - "comercial" is WRONG (correct: "commercial")
   - Missing letters, extra letters, or swapped letters = WRONG
   
2. Accept ONLY:
   - Exact match (case-insensitive)
   - True synonyms (e.g., "religious" = "faithful", "athletic" = "sporty")
   - British vs American spelling (e.g., "colour" = "color")
   - With/without "to" for infinitives (e.g., "to whistle" = "whistle")
   
3. REJECT:
   - Spelling errors (even minor typos)
   - Wrong word endings
   - Letter transpositions
   - Anything that is not the exact word or a genuine synonym

Be STRICT. This is a test. Spelling errors must count as wrong.

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
        temperature: 0,  // Reduziert auf 0 für konsistentere Bewertung
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
