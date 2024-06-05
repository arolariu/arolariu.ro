/** @format */

import {Server as HttpServer} from "http";
import {Server as NetServer, Socket} from "net";
import {NextApiRequest, NextApiResponse} from "next";
import {Server as SocketIOServer} from "socket.io";

type NextApiResponseWithSocketIo = NextApiResponse & {
  socket: Socket & {
    server: NetServer & {
      io: SocketIOServer;
    };
  };
};

export const config = {
  api: {
    bodyParser: false,
  },
};

export const dynamic = "force-dynamic";

/**
 * The socket route can be used to interact with socketIO for WebRTC and websocket communications, based on events.
 * Currently, we have two use cases: chat messaging via websockets and video call via WebRTC.
 * We only have one route handler for all the socket events.
 * @param req  The request object
 * @param res The response object
 * @returns void
 */
export default async function socketHandler(req: NextApiRequest, res: NextApiResponseWithSocketIo) {
  if (!res.socket.server.io) {
    console.log("Creating a new socket server instance...");
    const path = "/api/socket/io";
    const httpServer: HttpServer = res.socket.server as any;
    const io = new SocketIOServer(httpServer, {
      path,
      addTrailingSlash: false,
    });
    console.log("Socket server instance created successfully.");
    console.info("Adding the socket server instance to the response object...");
    res.socket.server.io = io;
  }

  console.log("Got socket from the response object: ", res.socket);
  const io = res.socket.server.io;
  console.log("Got hash of the server instance: ", io);

  io?.engine?.on("connection_error", (err) => {
    console.log(err.req); // the request object
    console.log(err.code); // the error code, for example 1
    console.log(err.message); // the error message, for example "Session ID unknown"
    console.log(err.context); // some additional error context
  });

  io.on("connection", (socket) => {
    console.log(`Socket ${socket.id} has been connected.`);

    listenForWebRtcEvents(socket, io);
    listenForWebsocketEvents(socket, io);

    socket.on("ping", (callback) => {
      console.log("Received ping from client.");
      callback();
    });

    socket.on("disconnect", () => {
      console.log(`Socket ${socket.id} has been disconnected.`);
    });
  });

  res.end();
}

/**
 * This function listens for WebRTC events.
 * @param socket The socket object
 * @param io The socketIO server object
 */
function listenForWebRtcEvents(socket, io) {
  // Triggered when a peer hits the join room button.
  socket.on("join", (roomName: string) => {
    const {rooms} = io.sockets.adapter;
    const room = rooms.get(roomName);

    if (room === undefined) {
      // Case 1: No room with the same name exists.
      socket.join(roomName);
      socket.emit("created");
    } else if (room.size === 1) {
      // Case 2: Room with the same name exists and only one person is inside.
      socket.join(roomName);
      socket.emit("joined");
    } else {
      // Case 3: Room with the same name exists and two people are inside.
      socket.emit("full");
    }

    console.log(rooms);
  });

  // Triggered when the person who joined the room is ready to communicate.
  socket.on("ready", (roomName: string) => {
    socket.broadcast.to(roomName).emit("ready");
  });

  // Triggered when server gets an icecandidate from a peer in the room.
  socket.on("ice-candidate", (candidate: RTCIceCandidate, roomName: string) => {
    console.log(candidate);
    socket.broadcast.to(roomName).emit("ice-candidate", candidate);
  });

  // Triggered when server gets an offer from a peer in the room.
  socket.on("offer", (offer, roomName: string) => {
    socket.broadcast.to(roomName).emit("offer", offer);
  });

  // Triggered when server gets an answer from a peer in the room
  socket.on("answer", (answer, roomName: string) => {
    socket.broadcast.to(roomName).emit("answer", answer);
  });

  // Triggered when a peer leaves the room.
  socket.on("leave", (roomName: string) => {
    socket.leave(roomName);
    socket.broadcast.to(roomName).emit("leave");
  });
}

function listenForWebsocketEvents(socket, io) {
  // Triggered when a peer sends a message to the room.
  socket.on("message", (message: string) => {
    console.log(`Received message: ${message}`);
    socket.broadcast.emit("message", message);
  });
}
