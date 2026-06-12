"use client";

import { useState } from "react";
import ResultsCard from "@/components/ResultsCard";
import HistorySidebar from "@/components/HistorySidebar";
import { Search, FileText, Link as LinkIcon, ShieldCheck, LogOut, User } from "lucide-react";
import { useSession, signOut } from "next-auth/react";

export default function Home() {
  const { data: session } = useSession();
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [activeTab, setActiveTab] = useState<"text" | "url">("text");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any | null>(null);

  const demoExamples = [
    {
      label: "Fake: Data Entry Rs. 50,000",
      type: "text",
      content: "Urgent hiring! Direct Joining for Data Entry jobs. Work from home guaranteed. Earn Rs. 50,000 monthly. Just pay Rs. 1000 registration fee. No interview. Contact on Whatsapp: 9876543210 or send CV to hr.infosys123@gmail.com",
    },
    {
      label: "Real: Junior Frontend Developer",
      type: "text",
      content: "We are looking for a Junior Frontend Developer with 0-1 years of experience in React and TailwindCSS. The role is hybrid in our Bangalore office. Salary range is 6-8 LPA depending on interview performance. Please apply through our careers portal. Valid candidates will be contacted for a 3-round technical interview.",
    },
    {
      label: "Fake: Wipro Immediate Joining",
      type: "text",
      content: "Wipro is hiring freshers for Software Engineer. 100% selection. Salary 10 Lakhs. Security deposit required Rs. 5000 refundable after joining. Apply in 24 hours.",
    }
  ];

  const handleAnalyze = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    const payload = activeTab === "text" ? { text } : { url };

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze job posting.');
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadDemo = (example: any) => {
    setActiveTab(example.type);
    if (example.type === "text") {
      setText(example.content);
    } else {
      setUrl(example.content);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 selection:bg-blue-100 selection:text-blue-900 flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-blue-600">
            <ShieldCheck className="w-8 h-8" />
            <span className="text-xl font-bold tracking-tight text-slate-900">FakeJob<span className="text-blue-600">Detector</span></span>
          </div>
          <nav className="flex items-center gap-4">
            {session ? (
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-slate-600 hidden sm:flex items-center gap-1">
                  <User className="w-4 h-4" /> {session.user?.email}
                </span>
                <button 
                  onClick={() => signOut()}
                  className="text-sm font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </div>
            ) : null}
          </nav>
        </div>
      </header>

      <div className="flex flex-1 flex-col lg:flex-row relative max-w-7xl mx-auto w-full">
        {/* Main Content */}
        <main className={`flex-1 px-6 py-12 flex flex-col items-center ${session ? 'lg:pr-80' : ''}`}>
          <div className="text-center max-w-3xl mb-12">
            <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-6 leading-tight">
              Spot Job Scams <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Before You Apply.</span>
            </h1>
            <p className="text-lg text-slate-600 leading-relaxed">
              Targeted at Indian job seekers, our AI analyzes job descriptions and URLs for common red flags, registration fees, and fake company details.
            </p>
          </div>

          <div className="w-full max-w-3xl bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden relative z-10">
            <div className="flex border-b border-slate-100">
              <button
                onClick={() => setActiveTab("text")}
                className={`flex-1 py-4 flex items-center justify-center gap-2 font-semibold transition-colors ${activeTab === 'text' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
              >
                <FileText className="w-5 h-5" /> Paste Description
              </button>
              <button
                onClick={() => setActiveTab("url")}
                className={`flex-1 py-4 flex items-center justify-center gap-2 font-semibold transition-colors ${activeTab === 'url' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
              >
                <LinkIcon className="w-5 h-5" /> Paste URL
              </button>
            </div>

            <form onSubmit={handleAnalyze} className="p-8">
              {activeTab === "text" ? (
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Paste the suspicious job description here... (e.g. 'Urgent requirement! Data entry work from home...')"
                  className="w-full h-48 p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none text-slate-700"
                  required
                />
              ) : (
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/job-posting"
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-700"
                  required
                />
              )}

              <button
                type="submit"
                disabled={loading || (activeTab === 'text' ? !text : !url)}
                className="mt-6 w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Search className="w-5 h-5" /> Analyze Job
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Demo Links */}
          <div className="mt-8 flex flex-wrap justify-center gap-3 max-w-3xl">
            <span className="text-slate-500 text-sm font-medium py-2">Try an example:</span>
            {demoExamples.map((ex, i) => (
              <button
                key={i}
                onClick={() => loadDemo(ex)}
                className="text-sm px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-full hover:bg-slate-50 hover:border-slate-300 transition-colors font-medium"
              >
                {ex.label}
              </button>
            ))}
          </div>

          {/* Results Component */}
          <ResultsCard data={result} loading={loading} error={error} />
        </main>

        {/* Optional Sidebar */}
        {session && <HistorySidebar onSelectHistory={(item) => {
          setResult(item);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }} />}
      </div>
    </div>
  );
}
