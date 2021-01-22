import * as net from 'net';
import { EventDispatcher, Handler } from './event-handling';

class Connection {
  private readonly _socket: net.Socket;
  private connectionEventDispatcher = new EventDispatcher<void>();
  private connectionErrorEventDispatcher = new EventDispatcher<Error>();
  private dataReceivedEventDispatcher = new EventDispatcher<Buffer>();
  private _disconnecting = false;
  private _retrying = false;
  private _timeout: number;

  constructor(private readonly _host: string, private readonly _port: number, socket: net.Socket | null = null) {
    this._socket = socket ?? new net.Socket();
    this._socket.on('connect', () => {
      this.connectEventHandler(this);
    });
    this._socket.on('data', (data) => {
      this.dataReceivedEventDispatcher.fire(data);
    });
    this._socket.on('error', (error) => {
      this.errorEventHandler(error, this);
    });
    this._socket.on('close', () => {
      this.closeEventHandler(this);
    });

    this._timeout = 1000;
  }

  public onConnection(handler: Handler<void>): void {
    this.connectionEventDispatcher.register(handler);
  }

  public onConnectionError(handler: Handler<Error>): void {
    this.connectionErrorEventDispatcher.register(handler);
  }

  public onDataReceived(handler: Handler<Buffer>): void {
    this.dataReceivedEventDispatcher.register(handler);
  }

  public connect(): void {
    this.connectInternal();
  }

  public write(buf: Buffer): void {
    this._socket.write(buf);
  }

  public disconnect(): void {
    this._disconnecting = true;
    this._socket.destroy();
  }

  private connectInternal(): void {
    this._disconnecting = false;
    this._socket.connect(this._port, this._host);
  }

  private connectEventHandler(conn: Connection): void {
    conn._retrying = false;
    conn.connectionEventDispatcher.fire();
  }

  private closeEventHandler(conn: Connection): void {
    if (!conn._disconnecting) {
      if (!conn._retrying) {
        conn._retrying = true;
      }

      setTimeout(
        (conn) => {
          conn.connectInternal();
        },
        conn._timeout,
        conn,
      );
    }
  }

  private errorEventHandler(error: Error, conn: Connection): void {
    conn.disconnect();
    conn.connectionErrorEventDispatcher.fire(error);
  }
}

export { Connection };
