import { ProviderIdSchema, SettingsSchema, FlashcardDeckSchema, QuizSchema, MindMapSchema, StudyPlanSchema, type ProviderId, type Settings, type FlashcardDeck, type Quiz, type MindMap, type StudyPlan, type MemoryAid } from "@classmate/contracts";
import { z } from "zod";

const defaultSettings: Settings = { schemaVersion: 1, theme: "dark", locale: "en", defaultProvider: "gemini", explanationDepth: "standard", telemetryConsent: false };
const CredentialSchema = z.object({ providerId: ProviderIdSchema, apiKey: z.string().min(1).max(1000).optional(), baseUrl: z.string().url().optional() });
export type DeviceCredential = z.infer<typeof CredentialSchema>;

const MemoryAidSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(["mnemonic", "acronym", "analogy", "story", "feynman"]),
  concept: z.string().min(1).max(500),
  aid: z.string().min(1).max(2000),
  explanation: z.string().max(1000).optional(),
  citations: z.array(z.string()),
});
export type StoredMemoryAid = z.infer<typeof MemoryAidSchema>;

const LearningArtifactsSchema = z.object({
  flashcardDecks: z.array(FlashcardDeckSchema),
  quizzes: z.array(QuizSchema),
  memoryAids: z.array(MemoryAidSchema),
  mindMaps: z.array(MindMapSchema),
  studyPlans: z.array(StudyPlanSchema),
});
export type LearningArtifacts = z.infer<typeof LearningArtifactsSchema>;

const defaultLearningArtifacts: LearningArtifacts = {
  flashcardDecks: [],
  quizzes: [],
  memoryAids: [],
  mindMaps: [],
  studyPlans: [],
};

export class ChromeSettingsRepository {
  async get(): Promise<Settings> { const stored = await chrome.storage.local.get("settings"); const parsed = SettingsSchema.safeParse(stored.settings); return parsed.success ? parsed.data : defaultSettings; }
  async save(settings: Settings): Promise<void> { await chrome.storage.local.set({ settings: SettingsSchema.parse(settings) }); }
  subscribe(listener: (settings: Settings) => void): () => void {
    const handle = (changes: Record<string, chrome.storage.StorageChange>, area: string): void => {
      const settingsChange = changes.settings;
      if (area !== "local" || !settingsChange?.newValue) return;
      const parsed = SettingsSchema.safeParse(settingsChange.newValue);
      if (parsed.success) listener(parsed.data);
    };
    chrome.storage.onChanged.addListener(handle);
    return () => chrome.storage.onChanged.removeListener(handle);
  }
}
export class ChromeCredentialVault {
  private key(providerId: ProviderId): string { return `credential:${providerId}`; }
  async get(providerId: ProviderId): Promise<DeviceCredential | undefined> { const stored = await chrome.storage.local.get(this.key(providerId)); const parsed = CredentialSchema.safeParse(stored[this.key(providerId)]); return parsed.success ? parsed.data : undefined; }
  async save(credential: DeviceCredential): Promise<void> { const validated = CredentialSchema.parse(credential); await chrome.storage.local.set({ [this.key(validated.providerId)]: validated }); }
  async remove(providerId: ProviderId): Promise<void> { await chrome.storage.local.remove(this.key(providerId)); }
}
export class ChromeLearningArtifactsRepository {
  private readonly STORAGE_KEY = "learningArtifacts";

  async get(): Promise<LearningArtifacts> {
    const stored = await chrome.storage.local.get(this.STORAGE_KEY);
    const parsed = LearningArtifactsSchema.safeParse(stored[this.STORAGE_KEY]);
    return parsed.success ? parsed.data : defaultLearningArtifacts;
  }

  async save(artifacts: LearningArtifacts): Promise<void> {
    await chrome.storage.local.set({ [this.STORAGE_KEY]: LearningArtifactsSchema.parse(artifacts) });
  }

  async addFlashcardDeck(deck: FlashcardDeck): Promise<void> {
    const artifacts = await this.get();
    const existingIndex = artifacts.flashcardDecks.findIndex((d) => d.id === deck.id);
    if (existingIndex >= 0) {
      artifacts.flashcardDecks[existingIndex] = deck;
    } else {
      artifacts.flashcardDecks.push(deck);
    }
    await this.save(artifacts);
  }

  async deleteFlashcardDeck(deckId: string): Promise<void> {
    const artifacts = await this.get();
    artifacts.flashcardDecks = artifacts.flashcardDecks.filter((d) => d.id !== deckId);
    await this.save(artifacts);
  }

  async addQuiz(quiz: Quiz): Promise<void> {
    const artifacts = await this.get();
    const existingIndex = artifacts.quizzes.findIndex((q) => q.id === quiz.id);
    if (existingIndex >= 0) {
      artifacts.quizzes[existingIndex] = quiz;
    } else {
      artifacts.quizzes.push(quiz);
    }
    await this.save(artifacts);
  }

  async deleteQuiz(quizId: string): Promise<void> {
    const artifacts = await this.get();
    artifacts.quizzes = artifacts.quizzes.filter((q) => q.id !== quizId);
    await this.save(artifacts);
  }

  async addMemoryAid(aid: StoredMemoryAid): Promise<void> {
    const artifacts = await this.get();
    const existingIndex = artifacts.memoryAids.findIndex((a) => a.id === aid.id);
    if (existingIndex >= 0) {
      artifacts.memoryAids[existingIndex] = aid;
    } else {
      artifacts.memoryAids.push(aid);
    }
    await this.save(artifacts);
  }

  async deleteMemoryAid(aidId: string): Promise<void> {
    const artifacts = await this.get();
    artifacts.memoryAids = artifacts.memoryAids.filter((a) => a.id !== aidId);
    await this.save(artifacts);
  }

  async addMindMap(mindMap: MindMap): Promise<void> {
    const artifacts = await this.get();
    const existingIndex = artifacts.mindMaps.findIndex((m) => m.id === mindMap.id);
    if (existingIndex >= 0) {
      artifacts.mindMaps[existingIndex] = mindMap;
    } else {
      artifacts.mindMaps.push(mindMap);
    }
    await this.save(artifacts);
  }

  async deleteMindMap(mindMapId: string): Promise<void> {
    const artifacts = await this.get();
    artifacts.mindMaps = artifacts.mindMaps.filter((m) => m.id !== mindMapId);
    await this.save(artifacts);
  }

  async addStudyPlan(studyPlan: StudyPlan): Promise<void> {
    const artifacts = await this.get();
    const existingIndex = artifacts.studyPlans.findIndex((s) => s.id === studyPlan.id);
    if (existingIndex >= 0) {
      artifacts.studyPlans[existingIndex] = studyPlan;
    } else {
      artifacts.studyPlans.push(studyPlan);
    }
    await this.save(artifacts);
  }

  async deleteStudyPlan(studyPlanId: string): Promise<void> {
    const artifacts = await this.get();
    artifacts.studyPlans = artifacts.studyPlans.filter((s) => s.id !== studyPlanId);
    await this.save(artifacts);
  }

  subscribe(listener: (artifacts: LearningArtifacts) => void): () => void {
    const handle = (changes: Record<string, chrome.storage.StorageChange>, area: string): void => {
      const change = changes[this.STORAGE_KEY];
      if (area !== "local" || !change?.newValue) return;
      const parsed = LearningArtifactsSchema.safeParse(change.newValue);
      if (parsed.success) listener(parsed.data);
    };
    chrome.storage.onChanged.addListener(handle);
    return () => chrome.storage.onChanged.removeListener(handle);
  }
}
export const settingsRepository = new ChromeSettingsRepository();
export const credentialVault = new ChromeCredentialVault();
export const learningArtifactsRepository = new ChromeLearningArtifactsRepository();
