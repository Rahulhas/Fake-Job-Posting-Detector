import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { scrapeJobUrl, extractDomain } from '@/lib/scraper';
import { runHeuristics } from '@/lib/heuristics';
import { lookupDomain } from '@/lib/whois';
import { cacheGet, cacheSet, checkRateLimit } from '@/lib/redis';
import crypto from 'crypto';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export const maxDuration = 60; // Allow longer execution time if needed for Vercel

export async function POST(req: Request) {
  try {
    // 1. Rate Limiting
    const ip = req.headers.get('x-forwarded-for') || 'anonymous';
    const rateLimit = await checkRateLimit(ip);
    
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { text, url } = body;

    if (!text && !url) {
      return NextResponse.json({ error: 'Please provide either text or a url.' }, { status: 400 });
    }

    let jobDescription = text || '';
    let domainInfo = null;

    // 2. Fetch URL content if provided
    if (url) {
      try {
        jobDescription = await scrapeJobUrl(url);
        const domain = extractDomain(url);
        if (domain) {
          domainInfo = await lookupDomain(domain);
        }
      } catch (e: any) {
        return NextResponse.json({ error: e.message || 'Failed to fetch URL' }, { status: 400 });
      }
    }

    if (jobDescription.length < 50) {
      return NextResponse.json({ error: 'Job description is too short to analyze.' }, { status: 400 });
    }

    // 3. Check Cache
    const hash = crypto.createHash('sha256').update(jobDescription).digest('hex');
    const cachedResult = await cacheGet(hash);
    if (cachedResult) {
      return NextResponse.json(cachedResult);
    }

    // 4. Run Heuristics pre-filter
    const heuristics = runHeuristics(jobDescription);

    // 5. AI Analysis (Gemini)
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured.");
    }

    const model = genAI.getGenerativeModel({
      model: 'gemini-flash-latest'
    });

    const prompt = `
    You are a fraud detection expert specializing in fake job postings in India. Analyze the job description for signs of scams targeting fresh graduates.
    
    Consider these India-specific scam patterns: upfront fees (registration/training/security deposit), unrealistic salary for freshers, work-from-home guaranteed, vague job roles, personal Gmail/WhatsApp contact only, clone names of real MNCs (e.g. 'Infosys IT Solutions'), urgency pressure ('apply in 24 hours'), no interview process mentioned.

    Return ONLY a JSON object with this exact structure (no markdown tags):
    {
      "ai_fraud_score": number (0-100, where 100 = definite scam),
      "red_flags": string[] (list of red flags found),
      "red_flag_explanations": { "flag_name": "explanation string" },
      "legitimacy_signals": string[] (list of good signs),
      "recommendation": string (1-2 sentences summarizing advice)
    }

    Job posting:
    ${jobDescription}
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    let cleanResponse = responseText.replace(/```json\n?|```\n?/g, '').trim();
    let aiAnalysis;
    
    try {
      aiAnalysis = JSON.parse(cleanResponse);
    } catch (parseError) {
      console.error("Failed to parse Gemini response:", responseText);
      throw new Error("AI returned an invalid response format.");
    }

    // 6. Aggregate Results
    // Combine heuristic score and AI score
    let finalScore = aiAnalysis.ai_fraud_score + heuristics.score_modifier;
    // Cap at 100
    finalScore = Math.min(100, Math.max(0, finalScore));

    let verdict = 'SAFE';
    if (finalScore >= 70) verdict = 'AVOID';
    else if (finalScore >= 40) verdict = 'CAUTION';

    const finalResult = {
      fraud_score: finalScore,
      verdict,
      red_flags: [...new Set([...heuristics.flags, ...(aiAnalysis.red_flags || [])])], // Deduplicate
      red_flag_explanations: aiAnalysis.red_flag_explanations || {},
      legitimacy_signals: aiAnalysis.legitimacy_signals || [],
      recommendation: aiAnalysis.recommendation,
      domain_info: domainInfo
    };

    // 7. Save to Cache
    await cacheSet(hash, finalResult);

    return NextResponse.json(finalResult);

  } catch (error: any) {
    console.error("Analyze API error:", error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred during analysis.' },
      { status: 500 }
    );
  }
}
