import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { scrapeJobUrl, extractDomain } from '@/lib/scraper';
import { runHeuristics } from '@/lib/heuristics';
import { lookupDomain } from '@/lib/whois';
import { cacheGet, cacheSet, checkRateLimit } from '@/lib/redis';
import crypto from 'crypto';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import History from "@/lib/models/History";

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
    You are an elite fraud detection expert specializing in fake job postings in India. Analyze this job description for signs of scams.
    
    Cross-reference the company name with your knowledge of MCA (Ministry of Corporate Affairs) registered entities and major LinkedIn profiles. Flag if it sounds like a fake 'clone' company (e.g. 'Infosys IT Solutions').
    Compare the offered salary to standard industry benchmarks for the specified role and city in India.
    Consider domain age: if domain_age_days is provided and < 365, treat it as highly suspicious.
    
    Domain Age Days: ${domainInfo ? domainInfo.domainAgeDays : 'Not available'}
    
    Return ONLY a JSON object with this exact structure (no markdown tags):
    {
      "ai_fraud_score": number (0-100, where 100 = definite scam),
      "red_flags": string[] (list of red flags found),
      "red_flag_explanations": { "flag_name": "explanation string" },
      "legitimacy_signals": string[] (list of good signs),
      "recommendation": string (1-2 sentences summarizing advice),
      "company_verification": {
        "is_likely_registered": boolean (true if it sounds like a legitimate, verifiable MCA/LinkedIn company, false otherwise),
        "explanation": string (reasoning for verification status)
      },
      "salary_analysis": {
        "amount": string (extracted salary or 'Not specified'),
        "benchmark_assessment": string (e.g., 'Unrealistically high for fresher role in this city' or 'Within normal ranges'),
        "is_reasonable": boolean
      },
      "extracted_data": {
        "company_name": string (extracted company name or ''),
        "contact_email": string (extracted email or ''),
        "contact_phone": string (extracted phone or ''),
        "role": string,
        "city": string
      }
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
    
    // 6. Campaign Detection using MongoDB
    let campaignRisk = { isCampaign: false, similarPostingsCount: 0 };
    try {
      await dbConnect();
      const extracted = aiAnalysis.extracted_data || {};
      
      const queryParams: any[] = [];
      if (extracted.contact_email && extracted.contact_email.length > 5 && !extracted.contact_email.includes('gmail.com')) {
         queryParams.push({ contactEmail: extracted.contact_email });
      } else if (extracted.contact_email && extracted.contact_email.includes('gmail.com')) {
         // for free emails, we query if there are matches
         queryParams.push({ contactEmail: extracted.contact_email });
      }
      
      if (extracted.contact_phone && extracted.contact_phone.length > 8) {
         queryParams.push({ contactPhone: extracted.contact_phone });
      }

      if (queryParams.length > 0) {
        // Find other jobs with same contact info that had a high fraud score
        const similarCount = await History.countDocuments({
          $or: queryParams,
          fraudScore: { $gte: 60 }
        });

        if (similarCount > 0) {
          campaignRisk = { isCampaign: true, similarPostingsCount: similarCount };
          finalScore += 25; // Massive penalty for being part of a detected scam campaign
          aiAnalysis.red_flags = aiAnalysis.red_flags || [];
          aiAnalysis.red_flags.push("Scam Campaign Detected");
          aiAnalysis.red_flag_explanations = aiAnalysis.red_flag_explanations || {};
          aiAnalysis.red_flag_explanations["Scam Campaign Detected"] = `This contact information has been flagged in ${similarCount} other fraudulent job postings in our database.`;
        }
      }
    } catch (err) {
      console.error("Campaign detection error:", err);
    }

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
      domain_info: domainInfo,
      company_verification: aiAnalysis.company_verification,
      salary_analysis: aiAnalysis.salary_analysis,
      campaign_risk: campaignRisk,
      extracted_data: aiAnalysis.extracted_data
    };

    // 7. Save to Cache
    await cacheSet(hash, finalResult);

    // 8. Save to DB if user is logged in
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      try {
        await dbConnect();
        await History.create({
          userId: session.user.id,
          inputType: url ? 'url' : 'text',
          inputValue: url ? url : (text.substring(0, 100) + '...'),
          fraudScore: finalScore,
          verdict,
          redFlags: finalResult.red_flags,
          recommendation: finalResult.recommendation,
          companyName: aiAnalysis.extracted_data?.company_name,
          contactEmail: aiAnalysis.extracted_data?.contact_email,
          contactPhone: aiAnalysis.extracted_data?.contact_phone,
          salaryDetails: {
            amount: aiAnalysis.salary_analysis?.amount,
            benchmarkAssessment: aiAnalysis.salary_analysis?.benchmark_assessment,
            isReasonable: aiAnalysis.salary_analysis?.is_reasonable
          },
          companyVerification: {
            isLikelyRegistered: aiAnalysis.company_verification?.is_likely_registered,
            explanation: aiAnalysis.company_verification?.explanation
          },
          campaignRisk: {
            isCampaign: campaignRisk.isCampaign,
            similarPostingsCount: campaignRisk.similarPostingsCount
          }
        });
      } catch (dbError) {
        console.error("Failed to save history to DB:", dbError);
      }
    }

    return NextResponse.json(finalResult);

  } catch (error: any) {
    console.error("Analyze API error:", error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred during analysis.' },
      { status: 500 }
    );
  }
}
