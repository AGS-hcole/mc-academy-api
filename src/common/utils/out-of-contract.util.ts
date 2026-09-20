import { FormulaType, SessionSlot } from '@prisma/client';

export function computeOutOfContract(
  formula: FormulaType | null,
  slot: SessionSlot,
): boolean {
  return (
    (formula === 'MORNING' && slot === 'PM') ||
    (formula === 'AFTERNOON' && slot === 'AM')
  );
}
