import fs from 'fs';
import path from 'path';
import mammoth from 'mammoth';
import JSZip from 'jszip';
import { GoogleGenerativeAI } from '@google/generative-ai';

async function extractTextFromPdfWithOCR(filePath: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set');
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
  const pdfBase64 = fs.readFileSync(filePath).toString('base64');
  const result = await model.generateContent([
    { inlineData: { mimeType: 'application/pdf', data: pdfBase64 } },
    'Extract all text content from this PDF. Return only the extracted text, preserving structure.',
  ]);
  return result.response.text();
}

export async function extractText(filePath: string, fileType: string): Promise<string> {
  const ext = fileType.toLowerCase();

  if (ext === 'pdf') {
    // Dynamic import to handle pdf-parse module issues
    const pdfParse = require('pdf-parse');
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    // If pdf-parse got nothing (image-based/scanned PDF), fall back to Gemini OCR
    if (!data.text || data.text.trim() === '') {
      return extractTextFromPdfWithOCR(filePath);
    }
    return data.text;
  }

  if (ext === 'docx') {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  }

  if (ext === 'pptx') {
    // PPTX is a zip file containing XML slides
    const data = fs.readFileSync(filePath);
    const zip = await JSZip.loadAsync(data);
    const texts: string[] = [];
    const slideFiles = Object.keys(zip.files)
      .filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name))
      .sort();

    for (const slideFile of slideFiles) {
      const xml = await zip.files[slideFile].async('string');
      // Extract text from XML tags
      const matches = xml.match(/<a:t[^>]*>([^<]+)<\/a:t>/g) || [];
      const slideText = matches.map(m => m.replace(/<[^>]+>/g, '')).join(' ');
      if (slideText.trim()) texts.push(slideText.trim());
    }
    return texts.join('\n\n');
  }

  throw new Error(`Unsupported file type: ${fileType}`);
}
