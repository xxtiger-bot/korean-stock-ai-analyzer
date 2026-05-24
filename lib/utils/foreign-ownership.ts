export type ForeignOwnershipDisplay = {
  effectiveRate: number | null;
  effectiveLabel: string;
  sourceField: "exhaustionRate" | "ownershipRatio" | "none";
  isAvailable: boolean;
};

function toPositiveFiniteNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }
  return value;
}

export function resolveForeignOwnershipDisplay(data: any): ForeignOwnershipDisplay {
  const exhaustionRate = toPositiveFiniteNumber(
    data?.foreignExhaustionRate ?? data?.exhaustionRate
  );
  if (exhaustionRate !== null) {
    return {
      effectiveRate: exhaustionRate,
      effectiveLabel: "외국인 소진율",
      sourceField: "exhaustionRate",
      isAvailable: true
    };
  }

  const ownershipRatio = toPositiveFiniteNumber(
    data?.foreignOwnershipRatio ?? data?.ownershipRatio ?? data?.ratio
  );
  if (ownershipRatio !== null) {
    return {
      effectiveRate: ownershipRatio,
      effectiveLabel: "외국인 보유율",
      sourceField: "ownershipRatio",
      isAvailable: true
    };
  }

  return {
    effectiveRate: null,
    effectiveLabel: "외국인 보유율",
    sourceField: "none",
    isAvailable: false
  };
}
