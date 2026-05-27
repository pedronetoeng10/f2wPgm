/**
 * Servidor local do WebGIS Viewer
 * Serve arquivos estáticos com MIME types corretos para GeoJSON/QMD
 */

const express = require("express");
const path = require("path");
const { exec } = require("child_process");

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const ROOT = __dirname;

app.use(function (req, res, next) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use(
  express.static(ROOT, {
    index: "index.html",
    setHeaders: function (res, filePath) {
      if (filePath.endsWith(".geojson")) {
        res.setHeader("Content-Type", "application/geo+json; charset=utf-8");
      }
      if (filePath.endsWith(".qmd")) {
        res.setHeader("Content-Type", "application/xml; charset=utf-8");
      }
    },
  })
);

app.get("/", function (req, res) {
  res.sendFile(path.join(ROOT, "index.html"));
});

app.use(function (req, res) {
  res.status(404).send("Arquivo não encontrado: " + req.path);
});

app.listen(PORT, function () {
  const url = "http://localhost:" + PORT;
  console.log("========================================");
  console.log(" WebGIS Viewer ativo");
  console.log(" URL: " + url);
  console.log(" Pasta: " + ROOT);
  console.log(" Pressione Ctrl+C para encerrar");
  console.log("========================================");

  if (process.env.NO_OPEN !== "1") {
    const cmd =
      process.platform === "win32"
        ? 'start "" "' + url + '"'
        : process.platform === "darwin"
          ? "open " + url
          : "xdg-open " + url;
    exec(cmd, function (err) {
      if (err) console.log("Abra manualmente:", url);
    });
  }
});
