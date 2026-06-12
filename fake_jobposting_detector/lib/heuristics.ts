export interface HeuristicResult {
  score_modifier: number;
  flags: string[];
}

export function runHeuristics(text: string): HeuristicResult {
  const lowerText = text.toLowerCase();
  let score_modifier = 0;
  const flags: string[] = [];

  // Patterns
  const patterns = [
    {
      regex: /registration\s*fee|security\s*deposit|training\s*fee|processing\s*fee/i,
      flag: "Mentions upfront fees (registration, security, training)",
      weight: 40,
    },
    {
      regex: /work\s*from\s*home\s*guaranteed|100%\s*wfh/i,
      flag: "Guaranteed Work From Home",
      weight: 15,
    },
    {
      regex: /earn\s*\d+\s*lakh|earn\s*(rs\.?|₹)\s*\d+\s*(lakh|crore)\s*(monthly|weekly)/i,
      flag: "Unrealistic salary claims",
      weight: 30,
    },
    {
      regex: /@gmail\.com|@yahoo\.com|@hotmail\.com|@rediffmail\.com|whatsapp\s*only/i,
      flag: "Personal email or WhatsApp only for corporate contact",
      weight: 25,
    },
    {
      regex: /apply\s*in\s*24\s*hours|immediate\s*hiring|urgent\s*requirement/i,
      flag: "High urgency pressure",
      weight: 10,
    },
    {
      regex: /no\s*interview|direct\s*joining|100%\s*selection/i,
      flag: "Suspiciously easy hiring process (No interview/Direct joining)",
      weight: 35,
    },
  ];

  patterns.forEach((p) => {
    if (p.regex.test(lowerText)) {
      score_modifier += p.weight;
      flags.push(p.flag);
    }
  });

  return { score_modifier, flags };
}
