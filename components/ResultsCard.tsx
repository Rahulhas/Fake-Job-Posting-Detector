"use client";

import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle, Info, ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";

interface ResultsCardProps {
  data: {
    fraud_score: number;
    verdict: string;
    red_flags: string[];
    red_flag_explanations: Record<string, string>;
    legitimacy_signals: string[];
    recommendation: string;
    domain_info?: any;
    campaign_risk?: {
      isCampaign: boolean;
      similarPostingsCount: number;
    };
    company_verification?: {
      is_likely_registered: boolean;
      explanation: string;
    };
    salary_analysis?: {
      amount: string;
      benchmark_assessment: string;
      is_reasonable: boolean;
    };
  } | null;
  loading: boolean;
  error: string | null;
}

export default function ResultsCard({ data, loading, error }: ResultsCardProps) {
  if (error) {
    return (
      <div className="w-full max-w-3xl mt-8 p-6 bg-red-50 border border-red-200 rounded-xl text-red-700">
        <div className="flex items-center gap-3 mb-2">
          <AlertTriangle className="w-6 h-6" />
          <h3 className="font-semibold text-lg">Analysis Error</h3>
        </div>
        <p>{error}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full max-w-3xl mt-8 p-8 bg-white border border-slate-200 rounded-2xl shadow-sm animate-pulse flex flex-col items-center">
        <div className="w-32 h-32 rounded-full border-8 border-slate-100 mb-6"></div>
        <div className="h-6 w-48 bg-slate-200 rounded mb-4"></div>
        <div className="h-4 w-3/4 bg-slate-200 rounded mb-2"></div>
        <div className="h-4 w-2/3 bg-slate-200 rounded"></div>
      </div>
    );
  }

  if (!data) return null;

  const { fraud_score, verdict, red_flags, red_flag_explanations, legitimacy_signals, recommendation, domain_info, campaign_risk, company_verification, salary_analysis } = data;

  const isSafe = verdict === 'SAFE';
  const isCaution = verdict === 'CAUTION';
  const isAvoid = verdict === 'AVOID';

  let colorClass = "text-emerald-600";
  let bgClass = "bg-emerald-50";
  let borderClass = "border-emerald-200";
  let Icon = ShieldCheck;

  if (isCaution) {
    colorClass = "text-amber-600";
    bgClass = "bg-amber-50";
    borderClass = "border-amber-200";
    Icon = ShieldQuestion;
  } else if (isAvoid) {
    colorClass = "text-red-600";
    bgClass = "bg-red-50";
    borderClass = "border-red-200";
    Icon = ShieldAlert;
  }

  // Calculate stroke dasharray for the circular gauge
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (fraud_score / 100) * circumference;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-3xl mt-12 bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100"
    >
      {/* Top Banner */}
      <div className={`p-8 flex flex-col md:flex-row items-center justify-between gap-8 ${bgClass} border-b ${borderClass}`}>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Icon className={`w-8 h-8 ${colorClass}`} />
            <h2 className={`text-3xl font-bold ${colorClass}`}>
              {verdict === 'AVOID' ? 'LIKELY SCAM - AVOID' : verdict === 'CAUTION' ? 'PROCEED WITH CAUTION' : 'APPEARS SAFE'}
            </h2>
          </div>
          <p className="text-slate-700 text-lg mt-4 font-medium">{recommendation}</p>
        </div>
        
        {/* Gauge */}
        <div className="relative flex flex-col items-center justify-center">
          <svg className="w-40 h-40 transform -rotate-90">
            <circle
              cx="80"
              cy="80"
              r="60"
              stroke="currentColor"
              strokeWidth="12"
              fill="transparent"
              className="text-slate-200"
            />
            <motion.circle
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              cx="80"
              cy="80"
              r="60"
              stroke="currentColor"
              strokeWidth="12"
              fill="transparent"
              strokeDasharray={circumference}
              className={`${colorClass}`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-4xl font-bold ${colorClass}`}>{fraud_score}</span>
            <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Score</span>
          </div>
        </div>
      </div>

      <div className="p-8 space-y-8">
        {/* Campaign Risk Badge */}
        {campaign_risk?.isCampaign && (
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-purple-50 p-6 rounded-2xl border border-purple-200 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <ShieldAlert className="w-24 h-24 text-purple-600" />
            </div>
            <h3 className="text-xl font-bold text-purple-900 mb-2 flex items-center gap-2 relative z-10">
              <ShieldAlert className="w-6 h-6" /> Scam Campaign Detected
            </h3>
            <p className="text-purple-700 relative z-10 text-sm font-medium">
              We have detected this exact contact information across <strong className="text-purple-900 bg-purple-200 px-2 py-0.5 rounded-full">{campaign_risk.similarPostingsCount} other fraudulent job postings</strong> in our database. This is a highly coordinated scam.
            </p>
          </motion.div>
        )}

        {/* Company & Salary Verification Panel */}
        {(company_verification || salary_analysis) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {company_verification && (
              <div className={`p-5 rounded-2xl border shadow-sm ${company_verification.is_likely_registered ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                <h3 className={`text-lg font-bold mb-2 flex items-center gap-2 ${company_verification.is_likely_registered ? 'text-emerald-900' : 'text-red-900'}`}>
                  {company_verification.is_likely_registered ? <CheckCircle className="w-5 h-5 text-emerald-600" /> : <AlertTriangle className="w-5 h-5 text-red-600" />}
                  Company Verification
                </h3>
                <p className={`text-sm ${company_verification.is_likely_registered ? 'text-emerald-700' : 'text-red-700'}`}>
                  {company_verification.explanation}
                </p>
              </div>
            )}

            {salary_analysis && (
              <div className={`p-5 rounded-2xl border shadow-sm ${salary_analysis.is_reasonable ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                <h3 className={`text-lg font-bold mb-2 flex items-center gap-2 ${salary_analysis.is_reasonable ? 'text-emerald-900' : 'text-red-900'}`}>
                  {salary_analysis.is_reasonable ? <CheckCircle className="w-5 h-5 text-emerald-600" /> : <AlertTriangle className="w-5 h-5 text-red-600" />}
                  Salary Benchmark
                </h3>
                <div className="mb-2">
                  <span className={`text-xs font-bold px-2 py-1 rounded-md ${salary_analysis.is_reasonable ? 'bg-emerald-200 text-emerald-800' : 'bg-red-200 text-red-800'}`}>
                    {salary_analysis.amount}
                  </span>
                </div>
                <p className={`text-sm ${salary_analysis.is_reasonable ? 'text-emerald-700' : 'text-red-700'}`}>
                  {salary_analysis.benchmark_assessment}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Red Flags Section */}
        {red_flags.length > 0 && (
          <section>
            <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <AlertTriangle className="text-red-500 w-5 h-5" /> 
              Red Flags Detected ({red_flags.length})
            </h3>
            <div className="space-y-3">
              {red_flags.map((flag, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-red-50/50 border border-red-100 flex gap-3">
                  <AlertTriangle className="text-red-500 w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-red-900">{flag}</p>
                    {red_flag_explanations && red_flag_explanations[flag] && (
                      <p className="text-red-700 text-sm mt-1">{red_flag_explanations[flag]}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Legitimacy Signals */}
        {legitimacy_signals.length > 0 && (
          <section>
            <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <CheckCircle className="text-emerald-500 w-5 h-5" />
              Positive Signals ({legitimacy_signals.length})
            </h3>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {legitimacy_signals.map((signal, idx) => (
                <li key={idx} className="flex items-start gap-2 text-slate-700 bg-emerald-50/30 p-3 rounded-lg border border-emerald-100">
                  <CheckCircle className="text-emerald-500 w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{signal}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Domain Info */}
        {domain_info && !domain_info.error && (
          <section className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Info className="text-blue-500 w-5 h-5" />
              Domain Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-500 block mb-1">Domain Name</span>
                <span className="font-medium text-slate-900">{domain_info.domainName || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-500 block mb-1">Creation Date</span>
                <span className="font-medium text-slate-900">
                  {domain_info.creationDate ? new Date(domain_info.creationDate).toLocaleDateString() : 'N/A'}
                </span>
              </div>
              <div className="md:col-span-2">
                <span className="text-slate-500 block mb-1">Registrar</span>
                <span className="font-medium text-slate-900">{domain_info.registrar || 'N/A'}</span>
              </div>
            </div>
          </section>
        )}
      </div>
    </motion.div>
  );
}
