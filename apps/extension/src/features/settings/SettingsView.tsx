import { zodResolver } from "@hookform/resolvers/zod";
import { ProviderIdSchema, SettingsSchema, type ProviderId, type Settings } from "@classmate/contracts";
import { Button, Card, LoadingState, useTheme } from "@classmate/ui";
import { useEffect, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { credentialVault, settingsRepository } from "../../adapters/chrome/storage";
import { useUiStore } from "../../stores/ui-store";

const FormSchema = SettingsSchema.extend({ apiKey: z.string().max(1000), ollamaBaseUrl: z.string().url() });
type FormValues = z.infer<typeof FormSchema>;
const providers = ProviderIdSchema.options;
export function SettingsView() {
  const [isLoading, setIsLoading] = useState(true); const [feedback, setFeedback] = useState<string>(); const setProvider = useUiStore((state) => state.setProvider); const { setTheme } = useTheme();
  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({ resolver: zodResolver(FormSchema), defaultValues: { schemaVersion: 1, theme: "dark", locale: "en", defaultProvider: "gemini", explanationDepth: "standard", telemetryConsent: false, apiKey: "", ollamaBaseUrl: "http://localhost:11434/v1" } });
  const selectedProvider = watch("defaultProvider");
  useEffect(() => { void Promise.all([settingsRepository.get(), credentialVault.get(selectedProvider)]).then(([settings, credential]) => { reset({ ...settings, apiKey: credential?.apiKey ?? "", ollamaBaseUrl: credential?.baseUrl ?? "http://localhost:11434/v1" }); setIsLoading(false); }); }, [reset, selectedProvider]);
  const save = async (values: FormValues): Promise<void> => { const { apiKey, ollamaBaseUrl, ...settings } = values; await settingsRepository.save(settings); if (settings.defaultProvider === "ollama") await credentialVault.save({ providerId: "ollama", baseUrl: ollamaBaseUrl }); else if (apiKey) await credentialVault.save({ providerId: settings.defaultProvider, apiKey }); setProvider(settings.defaultProvider); setTheme(settings.theme); setFeedback("Settings saved on this device."); };
  if (isLoading) return <LoadingState label="Loading settings" />;
  return <section aria-labelledby="settings-title"><h2 id="settings-title" className="text-xl font-bold">Settings</h2><p className="mt-1 text-sm text-muted-foreground">Credentials stay in device-local extension storage and are never synced.</p><form className="mt-4 space-y-4" onSubmit={(event) => void handleSubmit(save)(event)}><Card className="space-y-4 p-4"><Field label="Theme" error={errors.theme?.message}><select {...register("theme")} className="control"><option value="dark">Dark</option><option value="light">Light</option><option value="system">System</option></select></Field><Field label="Language" error={errors.locale?.message}><input {...register("locale")} className="control" autoComplete="off" /></Field></Card><Card className="space-y-4 p-4"><h3 className="font-semibold">AI provider</h3><Field label="Default free route" error={errors.defaultProvider?.message}><select {...register("defaultProvider")} className="control">{providers.map((provider) => <option key={provider} value={provider}>{provider}</option>)}</select></Field>{selectedProvider === "ollama" ? <Field label="Ollama endpoint" error={errors.ollamaBaseUrl?.message}><input {...register("ollamaBaseUrl")} className="control" inputMode="url" /></Field> : <Field label={`${selectedProvider} API key`} error={errors.apiKey?.message}><input {...register("apiKey")} className="control" type="password" autoComplete="off" /></Field>}</Card><Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving…" : "Save settings"}</Button>{feedback && <p role="status" className="text-sm text-success">{feedback}</p>}</form></section>;
}
function Field({ label, error, children }: { label: string; error?: string | undefined; children: ReactNode }) { return <label className="block text-sm font-medium">{label}<span className="mt-1 block">{children}</span>{error && <span className="mt-1 block text-xs text-danger">{error}</span>}</label>; }
