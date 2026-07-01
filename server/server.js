import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";

import { Server } from "socket.io";

import connectDB from "./config/db.js";
import tripRoutes from "./routes/tripRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import sosRoutes from "./routes/sosRoutes.js";
import alertRoutes from "./routes/alertRoutes.js";
import recordingRoutes
from "./routes/recordingRoutes.js";
import routeRoutes from "./routes/routeRoutes.js";
import testRoutes from "./routes/testRoutes.js";
dotenv.config();

const app = express();

app.use(cors());

app.use(express.json());

/* =========================
   ROUTES
========================= */

app.use("/api/auth", authRoutes);

app.use("/api/sos", sosRoutes);
app.use("/api/trips", tripRoutes);
app.use("/api/alerts", alertRoutes);
app.use(
  "/api/recordings",
  recordingRoutes
);
app.use("/api/routes", routeRoutes);
app.use("/api/test", testRoutes);
/* =========================
   HTTP SERVER
========================= */

const server = http.createServer(app);

/* =========================
   SOCKET.IO
========================= */

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

/* =========================
   SOCKET CONNECTION
========================= */

io.on("connection", (socket) => {

  console.log("🟢 User connected:", socket.id);

  /* =========================
     START TRIP
  ========================= */

  socket.on("start-trip", (data) => {

    console.log("🚕 Trip started:", data);

    io.emit("trip-started", data);
  });

  /* =========================
     LIVE LOCATION UPDATE
  ========================= */

  socket.on("send-location", (data) => {

    console.log("📍 Live Location:", data);

    io.emit("location-update", data);
  });

  /* =========================
     SOS ALERT
  ========================= */

  socket.on("sos-alert", (data) => {

    console.log("🚨 SOS ALERT:", data);

    io.emit("emergency-triggered", data);
  });

  /* =========================
     SAFETY CHECK RESPONSE
  ========================= */

  socket.on("safety-check-response", (data) => {

    console.log("✅ Safety Check:", data);

    io.emit("safety-status-update", data);
  });

  /* =========================
     END TRIP
  ========================= */

  socket.on("end-trip", (data) => {

    console.log("🏁 Trip ended:", data);

    io.emit("trip-ended", data);
  });

  /* =========================
     DISCONNECT
  ========================= */

  socket.on("disconnect", () => {

    console.log("🔴 User disconnected:", socket.id);
  });
});

/* =========================
   EXPORT IO
========================= */

export { io };

/* =========================
   DATABASE
========================= */

connectDB();

/* =========================
   START SERVER
========================= */

server.listen(process.env.PORT, () => {

  console.log(
    `🚀 Server running on port ${process.env.PORT}`
  );
});