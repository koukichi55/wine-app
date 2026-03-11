const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.post('/analyze', async (req, res) => {
  try {
    const { base64Image, mediaType } = req.body;
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64Image } },
            { type: 'text', text: 'You are a wine expert. Analyze this wine label and return ONLY a JSON object with: name, vintage, region, grape, producer, appellation, alcohol, description (in Japanese, 2-3 sentences), rating (85-100), color (red/white/rose/sparkling/dessert), confidence (high/medium/low). No markdown, no extra text.' }
          ]
        }]
      })
    });
    const data = await response.json();
    const text = data.content.map(function(b) { return b.text || ''; }).join('');
    const clean = text.replace(/```json|```/g, '').trim();
    res.json(JSON.parse(clean));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3001, function() {
  console.log('Server running on port 3001');
});
