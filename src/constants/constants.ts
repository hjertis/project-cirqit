export const STANDARD_PROCESS_NAMES = [
  "Setup",
  "SMT",
  "Inspection",
  "Repair/Rework",
  "HMT",
  "Wash",
  "Cut",
  "Test",
  "Delivery",
] as const;

export type StandardProcessName = (typeof STANDARD_PROCESS_NAMES)[number];

export const SERIALIZED_LABEL_ZPL = (
  partNumber: string,
  startSerial: string,
  quantity: number,
  yyww: string,
  copies: number = 2 // Default to 2 for backward compatibility
) => `
^XA
^PW390
^LL118
^FO25,35
^BXN,6,200
^FD^SN${yyww}${startSerial},1,Y^FS
^FO120,30
^A0N,40,30
^FD${partNumber}^FS
^FO120,70
^A0N,45,30
^FD^SN${yyww}${startSerial},1,Y^FS
^PQ${quantity},0,${copies},Y
^XZ
`;
