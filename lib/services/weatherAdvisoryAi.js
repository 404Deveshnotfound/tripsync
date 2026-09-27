/**
 * TripSync — AI Weather Disruption Advisory Service
 * Powered by Google Gemini with Groq fallback.
 */

// 1. Google Gemini AI Caller
async function callGemini(systemPrompt, userQuery) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

  const models = ['gemini-flash-latest', 'gemini-flash-lite-latest'];
  let lastErr = null;

  for (const model of models) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 9000);

      const contents = [
        {
          role: 'user',
          parts: [{ text: `${systemPrompt}\n\nTrip & Weather Data:\n${userQuery}` }]
        }
      ];

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents }),
        signal: controller.signal
      });

      clearTimeout(timeout);
      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error?.message || `Gemini API status ${res.status}`);
      }

      const answer = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (answer && answer.trim()) {
        return { answer: answer.trim(), source: 'Google Gemini' };
      }
    } catch (err) {
      console.warn(`Gemini (${model}) failed for weather advisory:`, err.message);
      lastErr = err;
    }
  }

  throw lastErr || new Error('All Gemini models failed');
}

// 2. Groq AI Caller (Fallback)
async function callGroq(systemPrompt, userQuery) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY not configured');

  const models = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b'];
  let lastErr = null;

  for (const model of models) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userQuery }
      ];

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.4,
          max_tokens: 350
        }),
        signal: controller.signal
      });

      clearTimeout(timeout);
      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error?.message || `Groq API status ${res.status}`);
      }

      const answer = data.choices?.[0]?.message?.content;
      if (answer && answer.trim()) {
        return { answer: answer.trim(), source: `Groq (${model})` };
      }
    } catch (err) {
      console.warn(`Groq (${model}) failed for weather advisory:`, err.message);
      lastErr = err;
    }
  }

  throw lastErr || new Error('All Groq models failed');
}

/**
 * Generate Weather Disruption Advisory using Gemini & Groq
 */
export async function generateWeatherAdvisory({
  tripTitle = 'Goa Adventure 2026',
  destination = 'Goa, India',
  visitedSpots = [],
  weatherData = {}
}) {
  const {
    isSimulated = false,
    rainfall = 24,
    windSpeed = 32,
    quality = 'Moderate',
    isBadWeather = false
  } = weatherData;

  const systemPrompt = `You are the TripSync Weather Disruption & Environmental Advisory Assistant.
Analyze the environmental conditions and the traveler group's visited spots and bookings.

GUIDELINES:
1. If the weather is adverse or bad (isBadWeather is true, rainfall > 15mm/h, wind > 30km/h, or quality is Moderate/Severe):
   - Provide 2 to 3 concise, actionable disruption advisories directly referencing the visited spots/locations and activities (e.g. water sports, coastal dining, highway transit).
   - Mention road waterlogging, transit safety buffers, or moving outdoor dining to covered decks.
2. If the weather is good/clear (isBadWeather is false, rainfall < 5mm/h, or quality is Optimal/Fair):
   - Provide 1 to 2 pleasant, encouraging travel insights and tips for the visited spots (e.g. ideal beach weather, smooth road conditions, perfect outdoor dining).
   - Reassure travelers that all itineraries are clear.
3. Tone: Professional, reassuring, and concise. Format with bullet points and bold titles. Avoid fluff or markdown headers larger than bold text.`;

  const spotsSummary = visitedSpots.length > 0 
    ? visitedSpots.map(s => `- ${s.name || s.title} (${s.category || 'Spot'}${s.coordinates ? ` @ ${s.coordinates}` : ''})`).join('\n')
    : `- Fisherman's Wharf, Salcete (Dining @ 15.1587, 73.9514)\n- Baga Beach Watersports (Activity @ 15.5524, 73.7517)\n- Luxury 4BHK Villa, Candolim (Stay @ 15.5173, 73.7629)\n- Pooja Fashions, Calangute (Shopping @ 15.5480, 73.7620)`;

  const userQuery = `Trip: "${tripTitle}"
Destination: ${destination}
Weather Condition: ${isSimulated ? 'Simulated What-If Scenario' : 'Live Real-Time Weather'}
- Rainfall Intensity: ${rainfall} mm/h
- Wind Gust Velocity: ${windSpeed} km/h
- Climate Quality: ${quality}
- Environmental Severity: ${isBadWeather ? 'Adverse / Hazardous' : 'Clear / Favorable'}

Visited & Planned Spots:
${spotsSummary}

Please generate the advisory.`;

  try {
    return await callGemini(systemPrompt, userQuery);
  } catch (geminiErr) {
    console.warn('Gemini failed for advisory, attempting Groq fallback:', geminiErr.message);
    try {
      return await callGroq(systemPrompt, userQuery);
    } catch (groqErr) {
      console.warn('Groq fallback failed, using resilient offline advisory:', groqErr.message);

      if (isBadWeather) {
        return {
          answer: `• **Maritime & Water Sports Caution:** With rainfall at **${rainfall} mm/h** and wind speeds of **${windSpeed} km/h**, water activities near Baga Beach and coastal spots should be rescheduled due to choppy seas and low visibility.\n• **Road Transit Precaution:** Key coastal corridors (including Zuari highway transit) may experience water accumulation. Add a 30-40 minute buffer for airport and intercity cabs.\n• **Dining & Venue Shift:** Open-air lawn venues like Fisherman's Wharf should transition to indoor covered dining decks to avoid rain squalls.`,
          source: 'Resilient Disruption Engine'
        };
      } else {
        return {
          answer: `• **Ideal Outdoor Conditions:** Skies are favorable with minimal rainfall (**${rainfall} mm/h**) and gentle breezes (**${windSpeed} km/h**). Perfect conditions for water sports at Baga Beach and outdoor coastal exploring.\n• **Smooth Road Travel:** All highway corridors and local transit routes are running with normal travel times and zero weather-related delays.`,
          source: 'Resilient Disruption Engine'
        };
      }
    }
  }
}
