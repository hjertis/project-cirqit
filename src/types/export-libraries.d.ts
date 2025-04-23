// src/types/export-libraries.d.ts

// Type declarations for export libraries
declare module "jspdf" {
  export class jsPDF {
    constructor(orientation?: string, unit?: string, format?: string);
    text(text: string, x: number, y: number, options?: any): jsPDF;
    addImage(
      imageData: string,
      format: string,
      x: number,
      y: number,
      width: number,
      height: number
    ): jsPDF;
    save(filename: string): void;
    setFontSize(size: number): jsPDF;
  }
  export default jsPDF;
}

declare module "html2canvas" {
  function html2canvas(element: HTMLElement, options?: any): Promise<HTMLCanvasElement>;
  export default html2canvas;
}

// Extend XLSX declaration for our needs
declare module "xlsx" {
  export const utils: {
    book_new(): any;
    json_to_sheet(data: any[]): any;
    book_append_sheet(workbook: any, worksheet: any, name: string): void;
  };
  export function writeFile(workbook: any, filename: string): void;
}
