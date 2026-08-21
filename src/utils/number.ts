export const safeNumber = (value: any, fallback = 0): number => {
  const n = Number(value);
  return isNaN(n) ? fallback : n;
};

export const safeFixed = (value: any, decimals = 2): string => {
  return safeNumber(value).toFixed(decimals);
};

const safeNum = (v: any, fallback = 0): number => {
  const n = Number(v);
  return isNaN(n) ? fallback : n;
};

const fmt = (n?: number, d = 2) =>
  safeNum(n).toLocaleString('en-US', {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });

const fmtUsd = (n?: number) => `$${fmt(n)}`;