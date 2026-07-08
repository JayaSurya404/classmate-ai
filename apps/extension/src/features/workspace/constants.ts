export const QUICK_ACTIONS = [
  {
    id: "summary" as const,
    label: "Summary",
    description: "Key ideas and takeaways",
    prompt: "Summarize the attached source with citations.",
  },
  {
    id: "explain_simple" as const,
    label: "Explain simply",
    description: "Plain language breakdown",
    prompt: "Explain the attached source in simple terms with citations.",
  },
  {
    id: "explain_deep" as const,
    label: "Deep explanation",
    description: "Detailed concept walkthrough",
    prompt: "Provide a deep explanation of the key concepts in the attached source with citations.",
  },
  {
    id: "rewrite" as const,
    label: "Rewrite",
    description: "Clearer study notes",
    prompt: "Rewrite the attached source as clearer study notes with citations.",
  },
  {
    id: "simplify" as const,
    label: "Simplify",
    description: "Easier reading level",
    prompt: "Simplify the attached source while preserving meaning and citations.",
  },
] as const;

export const RESPONSE_LENGTHS = [
  { id: "short", label: "Short" },
  { id: "medium", label: "Medium" },
  { id: "detailed", label: "Detailed" },
] as const;

export const PROMPT_SUGGESTIONS = [
  { id: "s1", label: "What are the main ideas?", prompt: "What are the main ideas in this source?" },
  { id: "s2", label: "Define key terms", prompt: "Define the key terms from this source." },
  { id: "s3", label: "Compare concepts", prompt: "Compare the most important concepts in this source." },
  { id: "s4", label: "Create an outline", prompt: "Create a study outline from this source." },
  { id: "s5", label: "What should I review?", prompt: "What should I review next based on this source?" },
] as const;

export const PROVIDER_LABELS = {
  gemini: "Gemini",
  groq: "Groq",
  openrouter: "OpenRouter",
  ollama: "Ollama",
} as const;
