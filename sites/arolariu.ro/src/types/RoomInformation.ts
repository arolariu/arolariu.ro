/** @format */

export type RoomInformation = {
  roomName: string;
  roomType: "chat" | "video" | "audio";
};

export type RoomMessage = {
  username?: string | undefined;
  message: string;
};
