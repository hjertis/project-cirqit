// src/__tests__/ProductionDashboard.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import ProductionDashboardPage from "../pages/ProductionDashboardPage";

// Mock window.fs.readFile
window.fs = {
  readFile: jest.fn()
    .mockResolvedValue(`No;Description;SourceNo;Quantity;StartingDateTime;EndingDateTime;Status;Notes;FinishedDate
1;TSP PRO Component;TSP001;100;01-05-2025;15-05-2025;Released;;
2;ICESPY Module;ICE100;50;10-05-2025;20-05-2025;In Progress;;
3;SKY Controller;SKY002;25;15-04-2025;25-04-2025;Finished;;30-04-2025`),
};

describe("Production Dashboard", () => {
  it("renders the production dashboard page", async () => {
    render(
      <BrowserRouter>
        <ProductionDashboardPage />
      </BrowserRouter>
    );

    // Initially shows loading
    expect(screen.getByText(/loading production data/i)).toBeInTheDocument();

    // After loading, dashboard should show title
    await waitFor(() => {
      expect(screen.getByText(/Production Plan Dashboard/i)).toBeInTheDocument();
    });

    // Should show tabs/view options
    expect(screen.getByText(/Overview/i)).toBeInTheDocument();
    expect(screen.getByText(/Timeline/i)).toBeInTheDocument();
    expect(screen.getByText(/Products/i)).toBeInTheDocument();
    expect(screen.getByText(/Efficiency/i)).toBeInTheDocument();

    // Initial view should be Overview with charts
    expect(screen.getByText(/Production Order Status/i)).toBeInTheDocument();
    expect(screen.getByText(/Monthly Production Volume/i)).toBeInTheDocument();
  });
});
