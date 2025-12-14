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
    
    // ULTRA-STRIKTER PROMPT - Null Toleranz für Fehler
    const prompt = `You are grading a spelling test. The student must spell words PERFECTLY.

German: "${german}"
Correct answer: "${correct}"
Student wrote: "${userAnswer}"

ZERO TOLERANCE RULES:
1. The student's answer must be EXACTLY correct OR a perfect synonym
2. ANY spelling error = WRONG
   - Missing letters = WRONG
   - Extra letters = WRONG  
   - Wrong letters = WRONG
3. The word must actually EXIST in English
   - "meannn" is NOT a word = WRONG
   - "remeber" is NOT a word (correct: remember) = WRONG
   - "somethhinng" is NOT a word = WRONG

EXAMPLES OF WRONG ANSWERS:
- "meannn sth" for "meaningful" = WRONG (not a real word)
- "remeber somethhinng" for "memorable" = WRONG (spelling errors)
- "exciteng" for "gripping" = WRONG (wrong word entirely)
- "artt" for "artificial" = WRONG (not a real word)
- "swiep" for "swipe" = WRONG (spelling error)
- "sequenec" for "sequence" = WRONG (spelling error)
- "dronee" for "drone" = WRONG (extra e)

ONLY accept as CORRECT:
- Perfect spelling match: "exercise" = "exercise" ✓
- True synonyms with perfect spelling: "gripping" = "exciting" ✓
- British/American variants: "colour" = "color" ✓

Check: Is "${userAnswer}" a real English word spelled perfectly that means "${correct}"?

Answer ONLY: "CORRECT" or "WRONG"`;

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
