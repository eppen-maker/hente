"use client";

import { useCallback, useMemo, useState } from "react";

import {
  projectFromProductsPerParticipant,
  projectFromProfitGoal,
  projectFromTotalProducts,
  recommendVolume,
} from "@/lib/calc/fundraising";
import { CALCULATOR_DEFAULTS, DEFAULT_PRICING_ID } from "@/lib/config/pricing";
import { clamp } from "@/lib/format";
import type { CampaignProjection, UUID } from "@/types";

export type CalculatorMode = "per-participant" | "profit-goal" | "total-volume";

export interface VolumeOption {
  volume: number;
  projection: CampaignProjection;
  recommended: boolean;
  selected: boolean;
}

export interface UseFundraisingCalculator {
  mode: CalculatorMode;
  setMode: (mode: CalculatorMode) => void;
  participants: number;
  setParticipants: (value: number) => void;
  productsPerParticipant: number;
  setProductsPerParticipant: (value: number) => void;
  profitGoal: number;
  setProfitGoal: (value: number) => void;
  customVolume: number;
  setCustomVolume: (value: number) => void;
  selectVolume: (volume: number) => void;
  projection: CampaignProjection;
  volumeOptions: VolumeOption[];
  limits: typeof CALCULATOR_DEFAULTS.limits;
}

interface Options {
  pricingId?: UUID;
  initialParticipants?: number;
}

/**
 * All calculator state in one place, so the result panel and the quick-volume
 * cards always agree on the current participant count.
 */
export function useFundraisingCalculator({
  pricingId = DEFAULT_PRICING_ID,
  initialParticipants = CALCULATOR_DEFAULTS.participants,
}: Options = {}): UseFundraisingCalculator {
  const { limits, quickVolumes } = CALCULATOR_DEFAULTS;

  const [mode, setMode] = useState<CalculatorMode>("per-participant");
  const [participants, setParticipantsRaw] = useState<number>(initialParticipants);
  const [productsPerParticipant, setProductsPerParticipantRaw] = useState<number>(
    CALCULATOR_DEFAULTS.productsPerParticipant,
  );
  const [profitGoal, setProfitGoalRaw] = useState<number>(CALCULATOR_DEFAULTS.profitGoal);
  const [customVolume, setCustomVolumeRaw] = useState<number>(
    CALCULATOR_DEFAULTS.participants * CALCULATOR_DEFAULTS.productsPerParticipant,
  );

  const setParticipants = useCallback(
    (value: number) =>
      setParticipantsRaw(clamp(Math.round(value), limits.participants.min, limits.participants.max)),
    [limits.participants.min, limits.participants.max],
  );

  const setProductsPerParticipant = useCallback(
    (value: number) =>
      setProductsPerParticipantRaw(
        clamp(
          Math.round(value),
          limits.productsPerParticipant.min,
          limits.productsPerParticipant.max,
        ),
      ),
    [limits.productsPerParticipant.min, limits.productsPerParticipant.max],
  );

  const setProfitGoal = useCallback(
    (value: number) =>
      setProfitGoalRaw(clamp(Math.round(value), limits.profitGoal.min, limits.profitGoal.max)),
    [limits.profitGoal.min, limits.profitGoal.max],
  );

  const setCustomVolume = useCallback(
    (value: number) =>
      setCustomVolumeRaw(
        clamp(Math.round(value), limits.customVolume.min, limits.customVolume.max),
      ),
    [limits.customVolume.min, limits.customVolume.max],
  );

  const selectVolume = useCallback(
    (volume: number) => {
      setCustomVolume(volume);
      setMode("total-volume");
    },
    [setCustomVolume],
  );

  const projection = useMemo<CampaignProjection>(() => {
    if (mode === "profit-goal") {
      return projectFromProfitGoal({ participants, profitGoal, pricingId });
    }
    if (mode === "total-volume") {
      return projectFromTotalProducts({ participants, totalProducts: customVolume, pricingId });
    }
    return projectFromProductsPerParticipant({
      participants,
      productsPerParticipant,
      pricingId,
    });
  }, [mode, participants, productsPerParticipant, profitGoal, customVolume, pricingId]);

  const volumeOptions = useMemo<VolumeOption[]>(() => {
    const recommended = recommendVolume(
      participants,
      quickVolumes,
      CALCULATOR_DEFAULTS.productsPerParticipant,
    );

    return quickVolumes.map((volume) => ({
      volume,
      projection: projectFromTotalProducts({ participants, totalProducts: volume, pricingId }),
      recommended: volume === recommended,
      selected: mode === "total-volume" && volume === customVolume,
    }));
  }, [participants, quickVolumes, pricingId, mode, customVolume]);

  return {
    mode,
    setMode,
    participants,
    setParticipants,
    productsPerParticipant,
    setProductsPerParticipant,
    profitGoal,
    setProfitGoal,
    customVolume,
    setCustomVolume,
    selectVolume,
    projection,
    volumeOptions,
    limits,
  };
}
