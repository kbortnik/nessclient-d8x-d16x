import * as net from 'net';
import { Connection } from '../src/connection';

test('reconnect on connection close', () => {
  jest.useFakeTimers();

  const socket = jest.genMockFromModule('net') as net.Socket;
  let closeEventHandler;
  socket.on = (event: string, listener: (...args: any[]) => void): net.Socket => {
    if (event === 'close') {
      closeEventHandler = listener;
    }
    return socket;
  };

  const connection = new Connection('0.1.2.3', 23, socket);
  connection.connect();

  const connect = socket.connect;
  expect(connect).toHaveBeenCalledTimes(1);

  // Simulate 'connection closed' event
  closeEventHandler.bind(connection)();

  // Advance timeout timer
  jest.advanceTimersByTime(1000);

  // Connection should be re-established after the
  // timeout period
  expect(connect).toHaveBeenCalledTimes(2);
});
