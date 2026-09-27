/**
 * TripSync — AI Natural Language Expense Parser Service
 * Multi-Provider Architecture:
 * 1. Google Gemini (Primary Provider)
 * 2. Groq (Secondary ultra-fast fallback)
 * 3. Local Deterministic Parser (Safety net)
 */

function buildParserPrompt(text, members = [], currentMemberId = null) {
  const membersList = members.map(m => `{"id": "${m.id}", "name": "${m.display_name}"}`).join(',\n  ');
  const currentMember = members.find(m => m.id === currentMemberId);

  return `You are a smart expense parsing AI for TripSync, a group travel app.
Given a natural language description of an expense, extract the structured details.

AVAILABLE MEMBERS IN THIS TRIP:
[
  ${membersList}
]

LOGGED IN TRAVELER ("me", "myself", "I"):
${currentMember ? `ID: "${currentMember.id}", Name: "${currentMember.display_name}"` : 'Unknown (infer from text)'}

USER EXPENSE INPUT:
"${text}"

TASK:
Extract the following information and output strictly valid JSON matching this schema:
{
  "title": "Clean, concise name for the expense (e.g. 'Lunch at Fisherman Wharf')",
  "category": "meal" | "transport" | "stay" | "activity" | "entertainment" | "utilities" | "other",
  "totalAmount": 2400 (number only, no currency symbols),
  "paidByMemberId": "id of the member who paid/fronted",
  "participantMemberIds": ["id1", "id2"] (array of member IDs who shared/benefited),
  "splitMethod": "equal" | "participant_based"
}

RULES:
1. If the text says "split equally", "for all", "for everyone", include all available member IDs in "participantMemberIds" and set splitMethod to "equal".
2. If specific names are mentioned (e.g. "for me and Priya"), only include their IDs in "participantMemberIds".
3. If "me" or "I" paid, use the logged-in traveler ID for "paidByMemberId".
4. If someone else is named as paying (e.g. "Vikram paid"), use their member ID for "paidByMemberId".
5. Extract amounts accurately (support formats like ₹2,400, 2400 rs, rs 2400, 2400.50).
6. Output raw JSON only. Do not wrap in markdown or backticks.`;
}

function sanitizeAndValidate(parsed, members, currentMemberId, rawText, source) {
  const validCategories = ['meal', 'transport', 'stay', 'activity', 'entertainment', 'utilities', 'other'];
  const category = validCategories.includes(parsed.category?.toLowerCase()) 
    ? parsed.category.toLowerCase() 
    : 'other';

  const validMemberIds = members.map(m => m.id);
  
  let paidByMemberId = parsed.paidByMemberId;
  if (!validMemberIds.includes(paidByMemberId)) {
    paidByMemberId = currentMemberId || members[0]?.id || '';
  }

  let participantMemberIds = Array.isArray(parsed.participantMemberIds)
    ? parsed.participantMemberIds.filter(id => validMemberIds.includes(id))
    : [];

  if (participantMemberIds.length === 0) {
    participantMemberIds = members.map(m => m.id);
  }

  let title = (parsed.title || '').trim();
  if (!title || title.length < 2) {
    title = `${category.charAt(0).toUpperCase() + category.slice(1)} Expense`;
  }

  const totalAmount = Math.max(0, Number(parsed.totalAmount) || 0);

  return {
    title,
    category,
    totalAmount,
    paidByMemberId,
    participantMemberIds,
    splitMethod: participantMemberIds.length === members.length ? 'equal' : 'participant_based',
    source,
    rawInput: rawText
  };
}

// 1. Google Gemini Caller
async function callGeminiParser(text, members, currentMemberId) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

  const prompt = buildParserPrompt(text, members, currentMemberId);
  const models = ['gemini-flash-lite-latest', 'gemini-3.1-flash-lite-preview', 'gemini-3-flash-preview', 'gemini-flash-latest'];
  let lastErr = null;

  for (const model of models) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }]
        }),
        signal: controller.signal
      });

      clearTimeout(timeout);
      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error?.message || `Gemini status ${res.status}`);
      }

      const rawOutput = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawOutput) throw new Error('Empty response from Gemini');

      const cleanedJson = rawOutput.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanedJson);
      return sanitizeAndValidate(parsed, members, currentMemberId, text, `Google Gemini (${model})`);
    } catch (err) {
      console.warn(`Gemini (${model}) expense parser failed:`, err.message);
      lastErr = err;
    }
  }

  throw lastErr || new Error('All Gemini models failed');
}

// 2. Groq AI Caller
async function callGroqParser(text, members, currentMemberId) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY not configured');

  const prompt = buildParserPrompt(text, members, currentMemberId);
  const models = ['qwen/qwen3.8-27b', 'openai/gpt-oss-20b', 'openai/gpt-oss-120b'];
  let lastErr = null;

  for (const model of models) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: 'You are an expense parser. Return valid JSON only without markdown or commentary.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.1,
          max_tokens: 512
        }),
        signal: controller.signal
      });

      clearTimeout(timeout);
      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error?.message || `Groq status ${res.status}`);
      }

      const rawOutput = data.choices?.[0]?.message?.content;
      if (!rawOutput) throw new Error('Empty response from Groq');

      const cleanedJson = rawOutput.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanedJson);
      return sanitizeAndValidate(parsed, members, currentMemberId, text, 'Groq AI');
    } catch (err) {
      console.warn(`Groq (${model}) expense parser failed:`, err.message);
      lastErr = err;
    }
  }

  throw lastErr || new Error('All Groq models failed');
}

// 3. Local Deterministic Parser (Tertiary Safety Net)
function parseNaturalLanguageExpenseLocal(text, members = [], currentMemberId = null) {
  const cleanText = text.trim();
  const lowerText = cleanText.toLowerCase();

  // Extract Amount
  let extractedAmount = null;
  const numMatches = cleanText.match(/\b\d+(?:,\d+)*(?:\.\d{1,2})?\b/g);
  if (numMatches && numMatches.length > 0) {
    extractedAmount = parseFloat(numMatches[0].replace(/,/g, ''));
  }

  // Extract Category
  let category = 'other';
  if (/lunch|dinner|breakfast|food|seafood|drinks|snack|tea|coffee|meal|restaurant|cafe|dhaba/i.test(lowerText)) {
    category = 'meal';
  } else if (/cab|taxi|uber|ola|rental|fuel|petrol|diesel|toll|bus|train|auto|flight/i.test(lowerText)) {
    category = 'transport';
  } else if (/hotel|villa|resort|airbnb|room|stay|homestay|hostel/i.test(lowerText)) {
    category = 'stay';
  } else if (/scuba|diving|trek|cruise|boat|tour|entry|ticket|safari|adventure|club|party/i.test(lowerText)) {
    category = 'entertainment';
  } else if (/grocery|water|supplies|supermarket|mart|beer|alcohol/i.test(lowerText)) {
    category = 'utilities';
  }

  // Extract Payer
  let paidByMemberId = currentMemberId || members[0]?.id;
  for (const m of members) {
    const firstName = m.display_name.split(' ')[0].toLowerCase();
    const payerRegex = new RegExp(`\\b${firstName}\\s+(?:paid|fronted|bought|spent)\\b`, 'i');
    if (payerRegex.test(lowerText)) {
      paidByMemberId = m.id;
      break;
    }
  }

  // Extract Participants
  let participantMemberIds = [];
  if (/for all|for everyone|for the group|split equally|among everyone/i.test(lowerText)) {
    participantMemberIds = members.map(m => m.id);
  } else {
    members.forEach(m => {
      const firstName = m.display_name.split(' ')[0].toLowerCase();
      if (m.id === currentMemberId && /\b(me|myself|i)\b/i.test(lowerText)) {
        if (!participantMemberIds.includes(m.id)) participantMemberIds.push(m.id);
      }
      if (new RegExp(`\\b${firstName}\\b`, 'i').test(lowerText)) {
        if (!participantMemberIds.includes(m.id)) participantMemberIds.push(m.id);
      }
    });

    if (participantMemberIds.length === 0) {
      participantMemberIds = members.map(m => m.id);
    } else if (currentMemberId && !participantMemberIds.includes(currentMemberId) && /\b(me|myself)\b/i.test(lowerText)) {
      participantMemberIds.push(currentMemberId);
    }
  }

  // Clean Title
  let title = cleanText.replace(/(?:i paid|paid|bought|spent|for me|for all|for everyone|₹\s*\d+|\d+\s*rs)/gi, '').trim();
  title = title.replace(/\s+/g, ' ');
  if (!title || title.length < 3) {
    title = `${category.charAt(0).toUpperCase() + category.slice(1)} Expense`;
  } else {
    title = title.charAt(0).toUpperCase() + title.slice(1);
  }

  return {
    title,
    category,
    totalAmount: extractedAmount || 0,
    paidByMemberId,
    participantMemberIds: participantMemberIds.length > 0 ? participantMemberIds : members.map(m => m.id),
    splitMethod: participantMemberIds.length === members.length ? 'equal' : 'participant_based',
    source: 'Local Parser',
    rawInput: cleanText
  };
}

// Main Orchestrator
export async function parseNaturalLanguageExpense(text, members = [], currentMemberId = null) {
  if (!text || typeof text !== 'string') {
    throw new Error('Please enter an expense description.');
  }

  // 1. Primary Ultra-Fast: Groq AI (~150ms)
  if (process.env.GROQ_API_KEY) {
    try {
      return await callGroqParser(text, members, currentMemberId);
    } catch (groqErr) {
      console.warn('Groq parser failed, falling back to Gemini...', groqErr.message);
    }
  }

  // 2. Secondary: Google Gemini
  if (process.env.GEMINI_API_KEY) {
    try {
      return await callGeminiParser(text, members, currentMemberId);
    } catch (geminiErr) {
      console.warn('Gemini expense parser failed, using local deterministic parser...', geminiErr.message);
    }
  }

  // 3. Safety Net: Local Deterministic Parser
  return parseNaturalLanguageExpenseLocal(text, members, currentMemberId);
}

