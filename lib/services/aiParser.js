/**
 * TripSync — AI Natural Language Expense Parser Service
 * Converts freeform traveler speech or text into structured expense drafts.
 * Works deterministically in both offline and online modes.
 * 
 * Example input: "I paid ₹2,400 for lunch at Fisherman's Wharf for me, Amit and Priya"
 * Output: { title: "Lunch at Fisherman's Wharf", category: "meal", totalAmount: 2400, paidByMemberId: "...", participantMemberIds: [...] }
 */

export function parseNaturalLanguageExpense(text, members = [], currentMemberId = null) {
  if (!text || typeof text !== 'string') {
    throw new Error('Please enter an expense description.');
  }

  const cleanText = text.trim();
  const lowerText = cleanText.toLowerCase();

  // 1. Extract Amount (e.g. ₹2,400, 2400 rs, rs 2400, 2400.50, INR 2400)
  let extractedAmount = null;
  const amountRegex = /(?:₹|rs\.?|inr)?\s*([0-9]+(?:,[0-9]+)*(?:\.[0-9]{1,2})?)\s*(?:₹|rs\.?|inr|rupees)?/i;
  const amountMatch = cleanText.match(amountRegex);
  
  // Also look for explicit numbers if regex captured non-numeric
  const numMatches = cleanText.match(/\b\d+(?:,\d+)*(?:\.\d{1,2})?\b/g);
  if (numMatches && numMatches.length > 0) {
    // Pick the most likely number (highest or closest to currency symbol)
    const cleanedNum = numMatches[0].replace(/,/g, '');
    extractedAmount = parseFloat(cleanedNum);
  }

  // 2. Extract Category
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

  // 3. Extract Payer
  let paidByMemberId = currentMemberId || members[0]?.id;
  // Check if someone else was mentioned as payer (e.g. "Amit paid", "Priya bought")
  for (const m of members) {
    const firstName = m.display_name.split(' ')[0].toLowerCase();
    const payerRegex = new RegExp(`\\b${firstName}\\s+(?:paid|fronted|bought|spent)\\b`, 'i');
    if (payerRegex.test(lowerText)) {
      paidByMemberId = m.id;
      break;
    }
  }

  // 4. Extract Participants
  let participantMemberIds = [];

  // Check for "all", "everyone", "the group"
  if (/for all|for everyone|for the group|split equally|among everyone/i.test(lowerText)) {
    participantMemberIds = members.map(m => m.id);
  } else {
    // Check which specific members were mentioned
    members.forEach(m => {
      const firstName = m.display_name.split(' ')[0].toLowerCase();
      // Match "me", "i", "myself" to current member
      if (m.id === currentMemberId && /\b(me|myself|i)\b/i.test(lowerText)) {
        if (!participantMemberIds.includes(m.id)) {
          participantMemberIds.push(m.id);
        }
      }
      // Match member name
      const nameRegex = new RegExp(`\\b${firstName}\\b`, 'i');
      if (nameRegex.test(lowerText)) {
        if (!participantMemberIds.includes(m.id)) {
          participantMemberIds.push(m.id);
        }
      }
    });

    // If "me" was the payer and no one else specified, include payer by default
    if (participantMemberIds.length === 0) {
      participantMemberIds = members.map(m => m.id); // Default to all if ambiguous
    } else if (currentMemberId && !participantMemberIds.includes(currentMemberId) && /\b(me|myself)\b/i.test(lowerText)) {
      participantMemberIds.push(currentMemberId);
    }
  }

  // 5. Clean Title
  let title = cleanText;
  // Remove currency phrases to make a clean title
  title = title.replace(/(?:i paid|paid|bought|spent|for me|for all|for everyone|₹\s*\d+|\d+\s*rs)/gi, '').trim();
  title = title.replace(/\s+/g, ' ');
  if (!title || title.length < 3) {
    title = `${category.charAt(0).toUpperCase() + category.slice(1)} Expense`;
  } else {
    // Capitalize first letter
    title = title.charAt(0).toUpperCase() + title.slice(1);
  }

  return {
    title,
    category,
    totalAmount: extractedAmount || 0,
    paidByMemberId,
    participantMemberIds: participantMemberIds.length > 0 ? participantMemberIds : members.map(m => m.id),
    splitMethod: participantMemberIds.length === members.length ? 'equal' : 'participant_based',
    rawInput: cleanText
  };
}
