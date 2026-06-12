"use client";

import { useEffect, useState } from "react";
import { Clock, ExternalLink, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";

export default function HistorySidebar({ onSelectHistory }: { onSelectHistory: (item: any) => void }) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/history");
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history);
      }
    } catch (err) {
      console.error("Error fetching history", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleSelect = (item: any) => {
    // Transform History DB model to match the format ResultsCard expects
    const formattedData = {
      fraud_score: item.fraudScore,
      verdict: item.verdict,
      red_flags: item.redFlags || [],
      red_flag_explanations: {}, // History doesn't store full explanations to save space, but UI handles gracefully
      legitimacy_signals: [],
      recommendation: item.recommendation,
      campaign_risk: item.campaignRisk,
      company_verification: item.companyVerification,
      salary_analysis: item.salaryDetails ? {
        amount: item.salaryDetails.amount,
        benchmark_assessment: item.salaryDetails.benchmarkAssessment,
        is_reasonable: item.salaryDetails.isReasonable
      } : undefined
    };
    onSelectHistory(formattedData);
  };

  return (
    <div className="w-full lg:w-80 bg-white border-l border-slate-200 lg:fixed lg:right-0 lg:top-0 lg:bottom-0 lg:pt-[73px] overflow-y-auto flex flex-col shadow-[-4px_0_24px_-10px_rgba(0,0,0,0.05)]">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-500" /> Recent Analyses
        </h3>
        <button onClick={fetchHistory} disabled={loading} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="p-4 flex-1 flex flex-col gap-3">
        {loading ? (
          <div className="flex flex-col gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse bg-slate-100 rounded-xl h-24 w-full"></div>
            ))}
          </div>
        ) : history.length === 0 ? (
          <div className="text-center text-slate-500 py-8 px-4 text-sm">
            You haven't analyzed any job postings yet. Your history will appear here.
          </div>
        ) : (
          history.map((item, idx) => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              key={item._id} 
              onClick={() => handleSelect(item)}
              className={`p-3 rounded-xl border cursor-pointer hover:shadow-md transition-all ${
                item.verdict === 'AVOID' ? 'bg-red-50/50 border-red-100 hover:bg-red-50' : 
                item.verdict === 'CAUTION' ? 'bg-amber-50/50 border-amber-100 hover:bg-amber-50' : 
                'bg-emerald-50/50 border-emerald-100 hover:bg-emerald-50'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                  item.verdict === 'AVOID' ? 'bg-red-100 text-red-700' : 
                  item.verdict === 'CAUTION' ? 'bg-amber-100 text-amber-700' : 
                  'bg-emerald-100 text-emerald-700'
                }`}>
                  {item.verdict} ({item.fraudScore})
                </span>
                <span className="text-[10px] text-slate-400">
                  {new Date(item.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className="text-xs text-slate-700 font-medium line-clamp-2 leading-relaxed">
                {item.inputType === 'url' ? (
                  <a href={item.inputValue} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                    {item.inputValue} <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  `"${item.inputValue}"`
                )}
              </p>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
