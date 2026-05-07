import { Server as SocketServer } from 'socket.io'

declare global {
  var _io: SocketServer | undefined
}
