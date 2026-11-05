
import express from "express";
import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV === "production";

const app = express();

const frontendPort = Number(
  process.env.PORT || process.env.FRONTEND_PORT || 5173
);

const backendUrl = (
  process.env.BACKEND_URL || "http://localhost:5000"
).replace(/\/+$/, "");

const clientDist = path.join(__dirname, "dist", "client");

let vite;
let render;

if (isProduction) {
  const serverBundle = await import(
    pathToFileURL(
      path.join(__dirname, "dist", "server", "entry-server.js")
    ).href
  );

  render = serverBundle.render;

  app.use(express.static(clientDist, { index: false }));
} else {
  const { createServer } = await import("vite");

  vite = await createServer({
    server: {
      middlewareMode: true,
      hmr: { server: undefined },
    },
    appType: "custom",
  });

  app.use(vite.middlewares);
}

const escapeHtml = (value = "") =>
  String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);

const cleanDescription = (value = "") =>
  String(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);

const safeJson = (value) =>
  JSON.stringify(value).replace(/</g, "\\u003c");

async function fetchPublicData(req) {
  if (req.path === "/journeys") {
    const response = await fetch(
      `${backendUrl}/api/packages?status=PUBLISHED`
    );

    if (!response.ok) {
      throw new Error(
        `Package list API returned ${response.status}`
      );
    }

    const body = await response.json();

    return {
      route: "journeys",
      data: {
        packages: body?.data || [],
      },
      title: "South India Journeys | Company A",
      description:
        "Explore thoughtfully planned journeys across Kerala and South India, with clear itineraries, stays and seasonal prices.",
    };
  }

  const packageMatch = req.path.match(
    /^\/package\/([^/]+)\/?$/
  );

  if (packageMatch) {
    const id = decodeURIComponent(packageMatch[1]);

    const response = await fetch(
      `${backendUrl}/api/packages/${encodeURIComponent(id)}`
    );

    if (!response.ok) {
      throw new Error(
        `Package detail API returned ${response.status}`
      );
    }

    const body = await response.json();
    const pkg = body?.data;

    if (!pkg || pkg.status !== "PUBLISHED") {
      return {
        route: "package",
        data: { packageData: null },
        status: 404,
        title: "Journey unavailable | Company A",
        description:
          "This journey is not currently available.",
      };
    }

    return {
      route: "package",
      data: { packageData: pkg },
      title: `${pkg.title} | Company A`,
      description:
        cleanDescription(pkg.description) ||
        `${pkg.title} — ${pkg.destination || "South India"}. View itinerary, stays and seasonal prices.`,
      packageData: pkg,
    };
  }

  return null;
}

async function getTemplate(url) {
  if (isProduction) {
    return fs.readFile(
      path.join(clientDist, "index.html"),
      "utf8"
    );
  }

  const template = await fs.readFile(
    path.join(__dirname, "index.html"),
    "utf8"
  );

  return vite.transformIndexHtml(url, template);
}

function applySeo(html, seo, req) {
  const title = escapeHtml(
    seo.title || "Company A | Journeys from Kochi"
  );

  const description = escapeHtml(
    seo.description ||
      "Discover thoughtfully planned journeys across South India."
  );

  const canonicalBase = (
    process.env.PUBLIC_SITE_URL ||
    `${req.protocol}://${req.get("host")}`
  ).replace(/\/+$/, "");

  const canonical = `${canonicalBase}${req.originalUrl.split("?")[0]}`;

  html = html.replace(
    /<title>[^<]*<\/title>/i,
    `<title>${title}</title>`
  );

  const headTags = [
    `<meta name="description" content="${description}">`,
    `<link rel="canonical" href="${escapeHtml(canonical)}">`,
    `<meta property="og:title" content="${title}">`,
    `<meta property="og:description" content="${description}">`,
    `<meta property="og:type" content="website">`,
  ].join("\n");

  return html.replace(
    "</head>",
    `${headTags}\n</head>`
  );
}

app.use(async (req, res, next) => {
  if (req.method !== "GET") {
    return next();
  }

  try {
    let requestData = null;

    const isPackageRoute = /^\/package\/[^/]+\/?$/.test(
      req.path
    );

    if (req.path === "/journeys" || isPackageRoute) {
      try {
        requestData = await fetchPublicData(req);
      } catch (error) {
        console.error(
          "SSR data fetch failed; falling back to client rendering:",
          error.message
        );

        requestData = null;
      }
    }

    if (!isProduction) {
      const serverModule = await vite.ssrLoadModule(
        "/src/entry-server.jsx"
      );

      render = serverModule.render;
    }

    let html = await getTemplate(req.originalUrl);

    if (requestData) {
      const appHtml = render(
        req.originalUrl,
        requestData.data
      );

      const bootstrap = `
        <script>
          window.__SSR_DATA__=${safeJson(requestData.data)};
        </script>
      `;

      html = html.replace(
        "</head>",
        `${bootstrap}\n</head>`
      );

      html = html.replace(
        '<div id="root"></div>',
        `<div id="root" data-ssr="true">${appHtml}</div>`
      );

      html = applySeo(html, requestData, req);

      return res
        .status(requestData.status || 200)
        .set({
          "Content-Type": "text/html; charset=utf-8",
        })
        .end(html);
    }

    // Non-SSR routes, including the admin area,
    // continue to use the existing SPA.
    return res
      .status(200)
      .set({
        "Content-Type": "text/html; charset=utf-8",
      })
      .end(html);

  } catch (error) {
    if (vite) {
      vite.ssrFixStacktrace(error);
    }

    console.error(error);

    return res
      .status(500)
      .send("Unable to render this page.");
  }
});

const server = app.listen(
  frontendPort,
  "0.0.0.0",
  () => {
    console.log(
      `Tour Operator frontend ${
        isProduction ? "SSR production" : "SSR development"
      } server running at http://localhost:${frontendPort}`
    );

    console.log(`Backend API: ${backendUrl}`);
  }
);

async function shutdown() {
  console.log("Shutting down frontend server...");

  if (vite) {
    await vite.close();
  }

  server.close(() => {
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
