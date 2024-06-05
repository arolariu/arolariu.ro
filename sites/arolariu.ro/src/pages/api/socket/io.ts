/** @format */

import {Server as HttpServer} from "http";
import {Server as NetServer, Socket} from "net";
import {NextApiResponse} from "next";
import {Socket as SocketIO, Server as SocketIOServer} from "socket.io";

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
export default async function socketHandler(res: NextApiResponseWithSocketIo) {
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
 * @param _socket The socket object
 * @param _io The socketIO server object
 */
function listenForWebRtcEvents(_socket: SocketIO, _io: SocketIOServer) {
  // Triggered when a peer hits the join room button.
  _socket.on("join", (roomName: string) => {
    const {rooms} = _io.sockets.adapter;
    const room = rooms.get(roomName);

    if (room === undefined) {
      // Case 1: No room with the same name exists.
      _socket.join(roomName);
      _socket.emit("created");
    } else if (room.size === 1) {
      // Case 2: Room with the same name exists and only one person is inside.
      _socket.join(roomName);
      _socket.emit("joined");
    } else {
      // Case 3: Room with the same name exists and two people are inside.
      _socket.emit("full");
    }

    console.log(rooms);
  });

  // Triggered when the person who joined the room is ready to communicate.
  _socket.on("ready", (roomName: string) => {
    _socket.broadcast.to(roomName).emit("ready");
  });

  // Triggered when server gets an icecandidate from a peer in the room.
  _socket.on("ice-candidate", (candidate: RTCIceCandidate, roomName: string) => {
    console.log(candidate);
    _socket.broadcast.to(roomName).emit("ice-candidate", candidate);
  });

  // Triggered when server gets an offer from a peer in the room.
  _socket.on("offer", (offer, roomName: string) => {
    _socket.broadcast.to(roomName).emit("offer", offer);
  });

  // Triggered when server gets an answer from a peer in the room
  _socket.on("answer", (answer, roomName: string) => {
    _socket.broadcast.to(roomName).emit("answer", answer);
  });

  // Triggered when a peer leaves the room.
  _socket.on("leave", (roomName: string) => {
    _socket.leave(roomName);
    _socket.broadcast.to(roomName).emit("leave");
  });
}

function listenForWebsocketEvents(_socket: SocketIO, _io: SocketIOServer) {
  // Triggered when a peer sends a message to the room.
  _socket.on("message", (message: string) => {
    console.log(`Received message: ${message}`);
    _socket.broadcast.emit("message", message);
  });
}
