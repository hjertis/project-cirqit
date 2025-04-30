/**
 * Safely reads a file using the window.fs API if available
 * @param fileName The name of the file to read
 * @param options Read options like encoding
 * @returns Promise with file contents or undefined
 */
export const safeReadFile = async (
  fileName: string,
  options?: { encoding?: string }
): Promise<string | ArrayBuffer | null> => {
  if (typeof window === "undefined") {
    console.warn("Not in browser environment, cannot read file");
    return null;
  }

  if (!window.fs || typeof window.fs.readFile !== "function") {
    console.warn("window.fs.readFile API not available");
    return null;
  }

  try {
    return await window.fs.readFile(fileName, options);
  } catch (error) {
    console.error(`Error reading file ${fileName}:`, error);
    throw error;
  }
};

/**
 * Sample data generator for dashboards when actual data is unavailable
 * @param dataType The type of sample data to generate
 * @returns Sample data array
 */
export const getSampleData = (
  dataType: "production" | "orders" | "resources" = "production"
): any[] => {
  switch (dataType) {
    case "production":
      return [
        {
          No: "001",
          Description: "TSP PRO Component",
          SourceNo: "TSP001",
          Quantity: 100,
          StartingDateTime: "01-05-2025",
          EndingDateTime: "15-05-2025",
          Status: "Released",
        },
        {
          No: "002",
          Description: "ICESPY Module",
          SourceNo: "ICE100",
          Quantity: 50,
          StartingDateTime: "10-05-2025",
          EndingDateTime: "20-05-2025",
          Status: "In Progress",
        },
        {
          No: "003",
          Description: "SKY Controller",
          SourceNo: "SKY002",
          Quantity: 25,
          StartingDateTime: "15-04-2025",
          EndingDateTime: "25-04-2025",
          Status: "Finished",
          FinishedDate: "30-04-2025",
        },
        {
          No: "004",
          Description: "TVP System",
          SourceNo: "TVP003",
          Quantity: 35,
          StartingDateTime: "01-06-2025",
          EndingDateTime: "15-06-2025",
          Status: "Planned",
        },
        {
          No: "005",
          Description: "TSP PRO Advanced",
          SourceNo: "TSP002",
          Quantity: 80,
          StartingDateTime: "01-07-2025",
          EndingDateTime: "20-07-2025",
          Status: "Released",
        },
        {
          No: "006",
          Description: "ICESPY Core",
          SourceNo: "ICE101",
          Quantity: 60,
          StartingDateTime: "15-06-2025",
          EndingDateTime: "30-06-2025",
          Status: "Released",
        },
        {
          No: "007",
          Description: "SKY Interface",
          SourceNo: "SKY003",
          Quantity: 40,
          StartingDateTime: "01-04-2025",
          EndingDateTime: "10-04-2025",
          Status: "Finished",
          FinishedDate: "12-04-2025",
        },
        {
          No: "008",
          Description: "TSP PRO Display",
          SourceNo: "TSP003",
          Quantity: 120,
          StartingDateTime: "01-03-2025",
          EndingDateTime: "15-03-2025",
          Status: "Finished",
          FinishedDate: "20-03-2025",
        },
        {
          No: "009",
          Description: "ICESPY Sensor",
          SourceNo: "ICE102",
          Quantity: 200,
          StartingDateTime: "01-05-2025",
          EndingDateTime: "25-05-2025",
          Status: "In Progress",
        },
        {
          No: "010",
          Description: "TVP Controller",
          SourceNo: "TVP004",
          Quantity: 45,
          StartingDateTime: "15-07-2025",
          EndingDateTime: "30-07-2025",
          Status: "Planned",
        },
      ];
    case "orders":
      return [];
    case "resources":
      return [];
    default:
      return [];
  }
};
