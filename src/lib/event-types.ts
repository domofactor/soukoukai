export const disciplines = ["GRIP", "DRIFT", "MIXED", "GYMKHANA", "PVC_DRIFT", "SHOW", "OTHER"] as const;
export type Discipline = typeof disciplines[number];
export const disciplineLabels: Record<Discipline, { en: string; ja: string }> = {
  GRIP: { en: "Grip", ja: "グリップ" },
  DRIFT: { en: "Drift", ja: "ドリフト" },
  MIXED: { en: "Grip + drift", ja: "グリップ・ドリフト" },
  GYMKHANA: { en: "Gymkhana", ja: "ジムカーナ" },
  PVC_DRIFT: { en: "PVC Drift", ja: "塩ビドリフト" },
  SHOW: { en: "Show", ja: "展示・ショー" },
  OTHER: { en: "Other", ja: "その他" }
};
