import type { StudyAction } from "@classmate/contracts";
import { promptRegistry, type PromptTemplate } from "./promptRegistry";

export function loadPromptTemplate(action: StudyAction, version = "1.0.0"): PromptTemplate {
  const template = promptRegistry[action];
  if (template.version !== version || template.status !== "active") {
    throw new Error(`Prompt template ${action}@${version} is unavailable`);
  }
  return template;
}
