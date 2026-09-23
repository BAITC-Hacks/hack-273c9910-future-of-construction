"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Decision, DistrictId } from "@/domain/types";
import { MEASURES_BY_ID } from "@/data/measures";
import { AppHeader } from "@/components/dashboard/AppHeader";
import { DistrictBoard } from "@/components/districts/DistrictBoard";
import { MeasureCatalog } from "@/components/measures/MeasureCatalog";
import { DecisionPanel } from "@/components/simulation/DecisionPanel";
import { PreviewPanel } from "@/components/simulation/PreviewPanel";
import { baselineDistricts, previewDecisions } from "@/engine/simulation";
import { baselineScore } from "@/engine/scoring";
import { totalCostOf, validateDecisions } from "@/engine/validator";
import { loadDecisions, saveDecisions, saveResult } from "@/lib/session";

export function SimulatorApp() {
  const router = useRouter();
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState<DistrictId>("nura");
  const [error, setError] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    setDecisions(loadDecisions());
  }, []);

  useEffect(() => {
    saveDecisions(decisions);
  }, [decisions]);

  const preview = useMemo(() => {
    const validation = validateDecisions(decisions, "partial");
    if (!validation.ok || decisions.length === 0) return null;
    try {
      return previewDecisions(decisions);
    } catch {
      return null;
    }
  }, [decisions]);

  const snapshots = preview?.districtsAfter ?? baselineDistricts();
  const headerScore = preview && decisions.length === 5
    ? preview.finalScore
    : baselineScore().finalScore;

  function addDecision(decision: Decision) {
    const next = [...decisions, decision];
    const validation = validateDecisions(next, "partial");
    if (!validation.ok) {
      setError(validation.errors[0]?.message ?? "Решение недопустимо.");
      return;
    }
    setError(null);
    setDecisions(next);
    if (decision.scope === "district") {
      setSelectedDistrict(decision.districtId);
    }
  }

  function removeDecision(measureId: Decision["measureId"]) {
    setError(null);
    setDecisions((current) => current.filter((item) => item.measureId !== measureId));
  }

  async function complete() {
    setCompleting(true);
    setError(null);
    try {
      const response = await fetch("/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decisions }),
      });
      const payload = await response.json();
      if (!payload.ok) {
        setError(payload.errors?.[0]?.message ?? "Симуляция отклонена.");
        return;
      }
      saveResult(payload.result);
      router.push("/results");
    } catch {
      setError("Не удалось связаться с simulation API.");
    } finally {
      setCompleting(false);
    }
  }

  return (
    <div className="min-h-screen">
      <AppHeader
        score={headerScore}
        spent={totalCostOf(decisions)}
        decisions={decisions.length}
        budget={100}
      />
      <main className="mx-auto grid max-w-[1440px] gap-6 px-6 py-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-8">
          <DistrictBoard
            districts={snapshots}
            selectedId={selectedDistrict}
            onSelect={setSelectedDistrict}
          />
          <MeasureCatalog decisions={decisions} onAdd={addDecision} />
        </div>
        <div className="space-y-4">
          <DecisionPanel
            decisions={decisions}
            onRemove={removeDecision}
            onComplete={complete}
            completing={completing}
          />
          <PreviewPanel preview={preview} />
          {error ? (
            <p className="rounded-2xl border border-rose/30 bg-rose/10 px-4 py-3 text-sm text-rose">
              {error}
            </p>
          ) : null}
          <p className="text-xs leading-5 text-muted">
            Frontend блокирует заведомо недопустимые действия. Backend остаётся source of truth.
            Порядок выбора не влияет на результат. Неиспользованный бюджет не даёт бонус.
          </p>
          <p className="text-xs text-muted">
            Каталог: {Object.keys(MEASURES_BY_ID).length} мероприятий, горизонт 8 кварталов.
          </p>
        </div>
      </main>
    </div>
  );
}
