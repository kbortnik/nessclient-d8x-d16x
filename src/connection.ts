import * as net from 'net';
import { EventDispatcher, Handler } from './event-handling';

class Connection {
  private readonly _socket: net.Socket;
  private dataReceivedEventDispatcher = new EventDispatcher<Buffer>();
  private _retrying = false;
  private _timeout: number;

  constructor(private readonly _host: string, private readonly _port: number, socket: net.Socket | null = null) {
    this._socket = socket ?? new net.Socket();
    this._socket.on('connect', this.connectEventHandler);
    this._socket.on('data', (data) => {
      this.dataReceivedEventDispatcher.fire(data);
    });
    this._socket.on('close', this.closeEventHandler);

    this._timeout = 1000;
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
    this._socket.destroy();
  }

  private connectInternal(): void {
    this._socket.connect(this._port, this._host);
  }

  private connectEventHandler(): void {
    this._retrying = false;
  }

  private closeEventHandler(): void {
    if (!this._retrying) {
      this._retrying = true;
    }

    setTimeout(() => {
      this.connectInternal();
    }, this._timeout);
  }
}

export { Connection };
