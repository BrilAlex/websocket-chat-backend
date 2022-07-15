import express from "express";
import http from "http";
import {Server} from "socket.io";

export type UserType = {
  id: string
  name: string
};
export type MessageType = {
  id: string
  message: string
  user: UserType
};

const app = express();
const server = http.createServer(app);
const socket = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
  }
});

app.get("/", (req, res) => {
  res.send("Hello, it's WS server");
});

const messagesData = [] as Array<MessageType>;

const users = new Map();

socket.on("connection", (socketChannel) => {
  users.set(socketChannel, {id: new Date().getTime().toString(), name: "anonymous"});

  socketChannel.emit("init-messages-published", messagesData, (data: string) => {
    console.log("Init messages received: " + data);
  });

  socketChannel.on("client-userName-sent", (userName: string) => {
    if (typeof userName !== "string") {
      return;
    }

    const user = users.get(socketChannel);
    user.name = userName;
  });

  socketChannel.on("client-message-sent", (message: string, successFn) => {
    if (typeof message !== "string" || message.length > 20) {
      successFn("Message length should me less than 20 chars");
      return;
    }

    const user = users.get(socketChannel);

    const newMessage = {
      id: String("_id" + messagesData.length + 1),
      message,
      user,
    };
    messagesData.push(newMessage);

    socket.emit("new-message-sent", newMessage);

    successFn(null);
  });

  socketChannel.on("client-typing-message", () => {
    socketChannel.broadcast.emit("user-typing", users.get(socketChannel));
  });

  socket.on("disconnect", () => {
    users.delete(socketChannel);
  });
});

const port = process.env.PORT || 3009;

server.listen(port, () => {
  console.log("listening on *:" + port);
});
