import { NextResponse } from 'next/server';
import { processReceiptOrUpiImage } from '@/lib/services/ocrService';

export async function POST(request) {
  try {
    const { 
      imageBase64, 
      mimeType = 'image/jpeg', 
      members = [], 
      currentMemberId = null 
    } = await request.json();

    if (!imageBase64) {
      return NextResponse.json({ 
        success: false, 
        error: 'Please upload or select an image file.' 
      }, { status: 400 });
    }

    const result = await processReceiptOrUpiImage({
      imageBase64,
      mimeType,
      members,
      currentMemberId
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('OCR + AI expense error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Failed to process image with OCR + AI' 
    }, { status: 500 });
  }
}
