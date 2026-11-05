import React from "react";
import { renderToString } from "react-dom/server";
import { Routes, Route } from "react-router-dom";
import { StaticRouter } from "react-router";
import PublicLayout from "./layouts/PublicLayout.jsx";
import KeralaJourneys from "./pages/public/KeralaJourneys.jsx";
import PackageDetails from "./pages/public/PackageDetails.jsx";

// The same public components are used by the browser app and this server renderer.
export function render(url, data = {}) {
  const markup = renderToString(
    <StaticRouter location={url}>
      <Routes>
        <Route
          path="/journeys"
          element={<PublicLayout><KeralaJourneys initialData={data.packages || []} /></PublicLayout>}
        />
        <Route
          path="/package/:id"
          element={<PublicLayout><PackageDetails initialData={data.packageData || null} /></PublicLayout>}
        />
      </Routes>
    </StaticRouter>
  );

  return markup;
}
