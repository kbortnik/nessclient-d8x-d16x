import { Connection } from './connection';
import { Handler, EventDispatcher } from './event-handling';
import { Packet, CommandType } from './packet';
import { BaseEvent } from './event';
import { Alarm, ArmingState } from './alarm';

class NessClient {
  public host: string;
  public port: number;

  private readonly _connection: Connection;
  private readonly _verbose: boolean;
  private _alarm: Alarm;
  private _statusLoop: NodeJS.Timeout | undefined;
  private _eventReceivedEventDispatcher = new EventDispatcher<BaseEvent>();

  constructor(host: string, port = 23, verbose = false) {
    this.host = host;
    this.port = port;
    this._verbose = verbose;

    this._connection = new Connection(host, port);
    this._alarm = new Alarm(true);
  }

  public onZoneChange(handler: Handler<[number, boolean]>): void {
    this._alarm.onZoneChange(handler);
  }

  public onStateChange(handler: Handler<ArmingState>): void {
    this._alarm.onStateChange(handler);
  }

  public onEventReceived(handler: Handler<BaseEvent>): void {
    this._eventReceivedEventDispatcher.register(handler);
  }

  public connect(): void {
    this._connection.connect();

    this._connection.onDataReceived((data) => {
      let packet: Packet;
      let event: BaseEvent;

      try {
        packet = Packet.decode(data.toString('utf8').trim());
        this._verbose && console.log('%s', packet);

        event = BaseEvent.decode(packet);
        this._verbose && console.log('%s', event);
      } catch (error) {
        this._verbose && console.log('Error decoding packet. ', error);
        return;
      }

      this._eventReceivedEventDispatcher.fire(event);

      this._alarm.handleEvent(event);
    });

    // Send the initial update command
    this.update();

    // Schedule the update command
    this._statusLoop = setInterval(() => {
      this.update();
    }, 60 * 1000);
  }

  public sendCommand(command: string): void {
    const packet = new Packet(0x00, 0x00, CommandType.USER_INTERFACE, command, null);

    const payload = packet.encode() + '\r\n';
    this._connection.write(Buffer.from(payload, 'ascii'));
  }

  public armAway(code: string | null): void {
    this.sendCommand(`A${code || ''}E`);
  }

  public armHome(code: string | null): void {
    this.sendCommand(`H${code || ''}E`);
  }

  public disarm(code: string): void {
    this.sendCommand(`${code}E`);
  }

  public panic(code: string): void {
    this.sendCommand(`*${code}#`);
  }

  public aux(outputId: number, state = true): void {
    this.sendCommand(`${outputId}${outputId}${state ? '*' : '#'}`);
  }

  public update(): void {
    this.sendCommand('S00');
    this.sendCommand('S14');
  }

  public disconnect(): void {
    this._connection.disconnect();
  }
}

export { NessClient, ArmingState };
