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
    
    // SEHR STRENGER PROMPT - Selbst kleine Tippfehler = falsch
    const prompt = `You are a strict English vocabulary teacher grading a spelling test.

German word: "${german}"
Correct English answer: "${correct}"
Student wrote: "${userAnswer}"

CRITICAL: Is the spelling EXACTLY correct?

STRICT SPELLING RULES:
❌ ANY spelling mistake = WRONG, including:
   - "occean" is WRONG (correct: "ocean") - extra 'c'
   - "girrl" is WRONG (correct: "girl") - extra 'r'  
   - "castel" is WRONG (correct: "castle") - missing 'e'
   - "whistel" is WRONG (correct: "whistle") - wrong letter
   - "comercial" is WRONG (correct: "commercial") - missing 'm'

✅ ONLY accept as CORRECT:
   1. PERFECT spelling (letter-for-letter match)
   2. True synonyms ("ocean" = "sea", "boy" = "lad", "town" = "city")
   3. British vs American ("colour"="color", "centre"="center")
   4. With/without "to" for verbs ("(to) look" = "look")

❌ REJECT everything else:
   - Missing letters
   - Extra letters
   - Wrong letters
   - Swapped letters
   - Different word endings
   - Phonetic spellings

This is a SPELLING test. One wrong letter = FAIL.

Think carefully: Is "${userAnswer}" the EXACT correct spelling of a valid English word that means "${correct}"?

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
