/**
 * TripSync — OCR + AI Service for Receipts & UPI Payment Screenshots
 * 
 * Pipeline:
 * 1. OCR Stage: Extracts verbatim raw text from image using Gemini Vision (or Tesseract fallback)
 * 2. AI Stage: Decodes parameters (title, category, amount, UTR, payer, participants) using Gemini / Groq
 * 3. Evidence Attachment: Preserves the image as verified proofUrl for verification queue
 */

import Tesseract from 'tesseract.js';

// 1. OCR Stage: Extract raw text from image
export async function extractTextFromImage(imageBase64, mimeType = 'image/jpeg') {
  const geminiKey = process.env.GEMINI_API_KEY;
  const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');

  // 1a. Try Google Gemini Vision OCR
  if (geminiKey) {
    const models = ['gemini-flash-latest', 'gemini-flash-lite-latest'];
    for (const model of models) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 9000);

        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              role: 'user',
              parts: [
                { 
                  text: 'Perform Optical Character Recognition (OCR). Transcribe all visible text, merchant names, rupee amounts (₹), UPI transaction IDs, UTR numbers, dates, and item lines from this receipt or payment screenshot verbatim. Do not summarize or format as JSON yet, output the exact transcribed text.' 
                },
                { 
                  inlineData: { 
                    mimeType: mimeType.includes('/') ? mimeType : 'image/jpeg', 
                    data: cleanBase64 
                  } 
                }
              ]
            }]
          }),
          signal: controller.signal
        });

        clearTimeout(timeout);
        const data = await res.json();

        if (res.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
          const rawText = data.candidates[0].content.parts[0].text.trim();
          if (rawText && !rawText.toLowerCase().includes('no text')) {
            return { rawText, ocrEngine: 'Google Gemini Vision OCR' };
          }
        }
      } catch (err) {
        console.warn(`Gemini Vision OCR (${model}) failed, trying next:`, err.message);
      }
    }
  }

  // 1b. Fallback to Tesseract.js
  try {
    const buffer = Buffer.from(cleanBase64, 'base64');
    const { data: { text } } = await Tesseract.recognize(buffer, 'eng');
    if (text && text.trim()) {
      return { rawText: text.trim(), ocrEngine: 'Tesseract OCR' };
    }
  } catch (err) {
    console.warn('Tesseract OCR fallback error:', err.message);
  }

  throw new Error('Could not extract text from the provided image. Please ensure the image is clear and legible.');
}

// 2. AI Stage: Decode extracted OCR text into expense parameters
export async function decodeOcrTextWithAi(rawText, members = [], currentMemberId = null) {
  const membersList = members.map(m => `{"id": "${m.id}", "name": "${m.display_name}"}`).join(',\n  ');
  const currentMember = members.find(m => m.id === currentMemberId);

  const prompt = `You are an AI financial auditor for TripSync.
You are given RAW OCR text extracted from a payment screenshot (Google Pay, PhonePe, Paytm, CRED, BHIM) or a paper bill/receipt.

RAW OCR EXTRACTED TEXT:
"""
${rawText}
"""

AVAILABLE TRIP MEMBERS:
[
  ${membersList}
]

CURRENT LOGGED-IN TRAVELER ("me", "paid by me", "debited from"):
${currentMember ? `ID: "${currentMember.id}", Name: "${currentMember.display_name}"` : 'Unknown'}

TASK:
Decode this OCR text into structured JSON:
{
  "title": "Clean concise expense title (e.g. 'Lunch at Fisherman Wharf' or 'Payment to Swiggy')",
  "category": "meal" | "transport" | "stay" | "activity" | "entertainment" | "utilities" | "other",
  "totalAmount": 1450.00 (number only, no currency symbol),
  "utr": "12-digit UPI reference ID / UTR or invoice receipt number if visible, otherwise null",
  "paidByMemberId": "id of member who paid, or logged-in traveler id",
  "participantMemberIds": ["id1", "id2"] (all members unless specified),
  "proofType": "upi_screenshot" | "bill_receipt"
}

RULES:
1. Detect if this is a "upi_screenshot" (look for GPay, PhonePe, Paytm, UPI, UTR, Ref No, BHIM, Bank Account) or a "bill_receipt" (restaurant bill, tax invoice, POS receipt).
2. Extract the 12-digit UPI UTR / Reference ID if present (e.g. 428192038192).
3. If amount is in decimals (e.g. ₹1,850.50), capture it as a float.
4. Output strictly raw JSON only. Do not wrap in markdown code blocks.`;

  // 2a. Try Google Gemini
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    const models = ['gemini-flash-latest', 'gemini-flash-lite-latest'];
    for (const model of models) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }]
          }),
          signal: controller.signal
        });

        clearTimeout(timeout);
        const data = await res.json();
        const out = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (out) {
          const cleaned = out.replace(/```json/gi, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleaned);
          return { parsed: sanitizeDecodedExpense(parsed, members, currentMemberId), aiEngine: 'Google Gemini' };
        }
      } catch (err) {
        console.warn(`Gemini OCR decoding (${model}) failed:`, err.message);
      }
    }
  }

  // 2b. Try Groq AI Fallback
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    const models = ['qwen/qwen3.8-27b', 'openai/gpt-oss-120b'];
    for (const model of models) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 7000);

        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${groqKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: 'You are an expense parser. Return valid JSON only without markdown commentary.' },
              { role: 'user', content: prompt }
            ],
            temperature: 0.1,
            max_tokens: 512
          }),
          signal: controller.signal
        });

        clearTimeout(timeout);
        const data = await res.json();
        const out = data.choices?.[0]?.message?.content;
        if (out) {
          const cleaned = out.replace(/```json/gi, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleaned);
          return { parsed: sanitizeDecodedExpense(parsed, members, currentMemberId), aiEngine: 'Groq AI' };
        }
      } catch (err) {
        console.warn(`Groq OCR decoding (${model}) failed:`, err.message);
      }
    }
  }

  // 2c. Fallback Regex Decoder
  return { 
    parsed: fallbackRegexOcrDecode(rawText, members, currentMemberId), 
    aiEngine: 'Local Rule Engine' 
  };
}

function sanitizeDecodedExpense(parsed, members, currentMemberId) {
  const validCategories = ['meal', 'transport', 'stay', 'activity', 'entertainment', 'utilities', 'other'];
  const category = validCategories.includes(parsed.category?.toLowerCase()) 
    ? parsed.category.toLowerCase() 
    : 'meal';

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

  const totalAmount = Math.max(0, Number(parsed.totalAmount) || 0);
  const utr = parsed.utr ? String(parsed.utr).trim() : '';

  return {
    title: (parsed.title || 'Scanned Expense').trim(),
    category,
    totalAmount,
    utr,
    paidByMemberId,
    participantMemberIds,
    splitMethod: participantMemberIds.length === members.length ? 'equal' : 'participant_based',
    proofType: parsed.proofType === 'bill_receipt' ? 'bill_receipt' : 'upi_screenshot'
  };
}

function fallbackRegexOcrDecode(rawText, members, currentMemberId) {
  const lower = rawText.toLowerCase();

  // Find amount
  let totalAmount = 0;
  const amtMatch = rawText.match(/(?:₹|rs\.?|inr)?\s*([0-9]+(?:,[0-9]+)*(?:\.[0-9]{1,2})?)/i);
  if (amtMatch) {
    totalAmount = parseFloat(amtMatch[1].replace(/,/g, '')) || 0;
  }

  // Find UTR (12 digits)
  let utr = '';
  const utrMatch = rawText.match(/\b\d{12}\b/);
  if (utrMatch) {
    utr = utrMatch[0];
  }

  // Detect proof type
  const isUpi = /upi|gpay|phonepe|paytm|bhim|utr|ref no|transaction id/i.test(lower);
  const proofType = isUpi ? 'upi_screenshot' : 'bill_receipt';

  // Category
  let category = 'meal';
  if (/cab|uber|ola|taxi|fuel|petrol|toll|flight/i.test(lower)) category = 'transport';
  else if (/hotel|resort|room|stay|villa/i.test(lower)) category = 'stay';
  else if (/scuba|ticket|entry|tour|cruise/i.test(lower)) category = 'activity';
  else if (/mart|supermarket|grocery|store/i.test(lower)) category = 'utilities';

  return {
    title: isUpi ? 'UPI Payment' : 'Scanned Receipt',
    category,
    totalAmount,
    utr,
    paidByMemberId: currentMemberId || members[0]?.id || '',
    participantMemberIds: members.map(m => m.id),
    splitMethod: 'equal',
    proofType
  };
}

// Master Pipeline Orchestrator
export async function processReceiptOrUpiImage({
  imageBase64,
  mimeType = 'image/jpeg',
  members = [],
  currentMemberId = null
}) {
  if (!imageBase64) {
    throw new Error('Image data is required.');
  }

  // Step 1: Optical Character Recognition (OCR)
  const { rawText, ocrEngine } = await extractTextFromImage(imageBase64, mimeType);

  // Step 2: AI Parameter Decoding
  const { parsed, aiEngine } = await decodeOcrTextWithAi(rawText, members, currentMemberId);

  // Format proof URL
  const proofUrl = imageBase64.startsWith('data:') 
    ? imageBase64 
    : `data:${mimeType};base64,${imageBase64}`;

  return {
    success: true,
    rawText,
    ocrEngine,
    aiEngine,
    proofUrl,
    parsed: {
      ...parsed,
      proofUrl
    }
  };
}
