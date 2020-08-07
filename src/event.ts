import { Struct } from 'struct';
import { Packet, PacketUtils, CommandType } from './packet';
import { EventType, AlarmType, ArmingStatus, OutputType, State, Model, AuxiliaryOutputType } from './event-types';

enum RequestID {
  ZONE_INPUT_UNSEALED = 0x0,
  ZONE_RADIO_UNSEALED = 0x1,
  ZONE_CBUS_UNSEALED = 0x2,
  ZONE_IN_DELAY = 0x3,
  ZONE_IN_DOUBLE_TRIGGER = 0x4,
  ZONE_IN_ALARM = 0x5,
  ZONE_EXCLUDED = 0x6,
  ZONE_AUTO_EXCLUDED = 0x7,
  ZONE_SUPERVISION_FAIL_PENDING = 0x8,
  ZONE_SUPERVISION_FAIL = 0x9,
  ZONE_DOORS_OPEN = 0x10,
  ZONE_DETECTOR_LOW_BATTERY = 0x11,
  ZONE_DETECTOR_TAMPER = 0x12,
  MISCELLANEOUS_ALARMS = 0x13,
  ARMING = 0x14,
  OUTPUTS = 0x15,
  VIEW_STATE = 0x16,
  PANEL_VERSION = 0x17,
  AUXILIARY_OUTPUTS = 0x18,
}

enum Zone {
  ZONE_1 = 0x0100,
  ZONE_2 = 0x0200,
  ZONE_3 = 0x0400,
  ZONE_4 = 0x0800,
  ZONE_5 = 0x1000,
  ZONE_6 = 0x2000,
  ZONE_7 = 0x4000,
  ZONE_8 = 0x8000,
  ZONE_9 = 0x0001,
  ZONE_10 = 0x0002,
  ZONE_11 = 0x0004,
  ZONE_12 = 0x0008,
  ZONE_13 = 0x0010,
  ZONE_14 = 0x0020,
  ZONE_15 = 0x0040,
  ZONE_16 = 0x0080,
}

abstract class BaseEvent {
  protected address: number | null;
  private timestamp: Date | null;

  constructor(address: number | null, timestamp: Date | null) {
    this.address = address;
    this.timestamp = timestamp;
  }

  static decode(packet: Packet): BaseEvent {
    if (packet.command == CommandType.SYSTEM_STATUS) {
      return SystemStatusEvent.decode(packet);
    } else if (packet.command == CommandType.USER_INTERFACE) {
      return StatusUpdate.decode(packet);
    } else {
      throw new Error(`Unknown command '${packet.command}'`);
    }
  }
}

class SystemStatusEvent extends BaseEvent {
  public type: EventType;
  public zone: number;
  private area: number;

  public constructor(type: EventType, zone: number, area: number, address: number | null, timestamp: Date | null) {
    super(address, timestamp);

    this.type = type;
    this.zone = zone;
    this.area = area;
  }

  static decode(packet: Packet): SystemStatusEvent {
    const eventType = parseInt(packet.data.slice(0, 2), 16);
    const zone = parseInt(packet.data.slice(2, 4));
    const area = parseInt(packet.data.slice(4, 6), 16);

    return new SystemStatusEvent(eventType, zone, area, packet.address, packet.timestamp);
  }
}

class StatusUpdate extends BaseEvent {
  protected readonly requestId: RequestID;

  protected constructor(requestId: RequestID, address: number | null, timestamp: Date | null) {
    super(address, timestamp);

    this.requestId = requestId;
  }

  public static decode(packet: Packet): StatusUpdate {
    const requestId: RequestID = parseInt(packet.data.slice(0, 2), 16);

    if (RequestID[requestId] && RequestID[requestId].startsWith('ZONE')) {
      return ZoneUpdate.decode(packet);
    } else if (requestId == RequestID.MISCELLANEOUS_ALARMS) {
      return MiscellaneousAlarmsUpdate.decode(packet);
    } else if (requestId == RequestID.ARMING) {
      return ArmingUpdate.decode(packet);
    } else if (requestId == RequestID.OUTPUTS) {
      return OutputsUpdate.decode(packet);
    } else if (requestId == RequestID.VIEW_STATE) {
      return ViewStateUpdate.decode(packet);
    } else if (requestId == RequestID.PANEL_VERSION) {
      return PanelVersionUpdate.decode(packet);
    } else if (requestId == RequestID.AUXILIARY_OUTPUTS) {
      return AuxiliaryOutputsUpdate.decode(packet);
    } else {
      throw new Error(`Unhandled requestId case: ${requestId}`);
    }
  }
}

class ByteArrayHelpers {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static UnpackUnsignedShortDataEnum(packet: Packet, type: any): number[] {
    const dataBytes: number[] = [];
    let data = packet.data;
    while (data.length >= 2) {
      dataBytes.push(parseInt(data.substring(0, 2), 16));

      data = data.substring(2, data.length);
    }

    const buf = Buffer.from(dataBytes.slice(1, 3));

    const dataStruct = new Struct().word16Ube('values');

    dataStruct.setBuffer(buf);

    const values = dataStruct.get('values');

    const vals: number[] = [];

    for (const enumMember of Object.keys(type)) {
      const enumVal = parseInt(enumMember, 10);
      if (enumVal > 0 && enumVal & values) {
        vals.push(enumVal);
      }
    }

    return vals;
  }

  static PackUnsignedShortDataEnum<T extends number>(items: T[]): string {
    let value = 0;
    for (const item of items) {
      value |= <number>(<unknown>item);
    }

    const dataStruct = new Struct().word16Ube('values');

    dataStruct.allocate();

    dataStruct.set('values', value);

    return dataStruct.buffer().toString('hex');
  }
}

class ZoneUpdate extends StatusUpdate {
  private readonly _includedZones: Zone[];

  public get includedZones(): Zone[] {
    return this._includedZones;
  }

  constructor(includedZones: Zone[], requestId: RequestID, address: number | null, timestamp: Date | null) {
    super(requestId, address, timestamp);

    this._includedZones = includedZones;
  }

  static decode(packet: Packet): ZoneUpdate {
    const requestId: RequestID = parseInt(packet.data.slice(0, 2), 16);
    return new ZoneUpdate(
      ByteArrayHelpers.UnpackUnsignedShortDataEnum(packet, Zone),
      requestId,
      packet.address,
      packet.timestamp,
    );
  }

  public encode(): Packet {
    const data = PacketUtils.toHex(this.requestId) + ByteArrayHelpers.PackUnsignedShortDataEnum(this._includedZones);
    return new Packet(this.address, 0x00, CommandType.USER_INTERFACE, data, null, true);
  }
}

class MiscellaneousAlarmsUpdate extends StatusUpdate {
  private _includedAlarms: AlarmType[];

  private constructor(includedAlarms: AlarmType[], address: number | null, timestamp: Date | null) {
    super(RequestID.MISCELLANEOUS_ALARMS, address, timestamp);

    this._includedAlarms = includedAlarms;
  }

  public static decode(packet: Packet): MiscellaneousAlarmsUpdate {
    return new MiscellaneousAlarmsUpdate(
      ByteArrayHelpers.UnpackUnsignedShortDataEnum(packet, AlarmType),
      packet.address,
      packet.timestamp,
    );
  }
}

class ArmingUpdate extends StatusUpdate {
  private _status: ArmingStatus[];

  public get status(): ArmingStatus[] {
    return this._status;
  }

  public constructor(status: ArmingStatus[], address: number | null, timestamp: Date | null) {
    super(RequestID.ARMING, address, timestamp);

    this._status = status;
  }

  public static decode(packet: Packet): ArmingUpdate {
    return new ArmingUpdate(
      ByteArrayHelpers.UnpackUnsignedShortDataEnum(packet, ArmingStatus),
      packet.address,
      packet.timestamp,
    );
  }

  public encode(): Packet {
    const data = PacketUtils.toHex(this.requestId) + ByteArrayHelpers.PackUnsignedShortDataEnum(this._status);
    return new Packet(this.address, 0x00, CommandType.USER_INTERFACE, data, null, true);
  }
}

class OutputsUpdate extends StatusUpdate {
  private _outputs: OutputType[];

  private constructor(outputs: OutputType[], address: number | null, timestamp: Date | null) {
    super(RequestID.OUTPUTS, address, timestamp);

    this._outputs = outputs;
  }

  public static decode(packet: Packet): OutputsUpdate {
    return new OutputsUpdate(
      ByteArrayHelpers.UnpackUnsignedShortDataEnum(packet, OutputType),
      packet.address,
      packet.timestamp,
    );
  }
}

class ViewStateUpdate extends StatusUpdate {
  private _state: State;

  private constructor(state: State, address: number | null, timestamp: Date | null) {
    super(RequestID.VIEW_STATE, address, timestamp);

    this._state = state;
  }

  public static decode(packet: Packet): ViewStateUpdate {
    const state = parseInt(packet.data.slice(2, 6), 16);
    return new ViewStateUpdate(state, packet.address, packet.timestamp);
  }
}

class PanelVersionUpdate extends StatusUpdate {
  private _model: Model;
  private _majorVersion: number;
  private _minorVersion: number;

  private constructor(
    model: Model,
    majorVersion: number,
    minorVersion: number,
    address: number | null,
    timestamp: Date | null,
  ) {
    super(RequestID.PANEL_VERSION, address, timestamp);

    this._model = model;
    this._majorVersion = majorVersion;
    this._minorVersion = minorVersion;
  }

  public get model(): Model {
    return this._model;
  }

  public get majorVersion(): number {
    return this._majorVersion;
  }

  public get minorVersion(): number {
    return this._minorVersion;
  }

  public get version(): string {
    return `${this._majorVersion}.${this._minorVersion}`;
  }

  public static decode(packet: Packet): PanelVersionUpdate {
    const model: Model = parseInt(packet.data.slice(2, 4), 16);
    const majorVersion = parseInt(packet.data.slice(4, 5), 16);
    const minorVersion = parseInt(packet.data.slice(5, 6), 16);
    return new PanelVersionUpdate(model, majorVersion, minorVersion, packet.address, packet.timestamp);
  }
}

class AuxiliaryOutputsUpdate extends StatusUpdate {
  private _outputs: AuxiliaryOutputType[];

  private constructor(outputs: AuxiliaryOutputType[], address: number | null, timestamp: Date | null) {
    super(RequestID.AUXILIARY_OUTPUTS, address, timestamp);

    this._outputs = outputs;
  }

  public static decode(packet: Packet): AuxiliaryOutputsUpdate {
    return new AuxiliaryOutputsUpdate(
      ByteArrayHelpers.UnpackUnsignedShortDataEnum(packet, AuxiliaryOutputType),
      packet.address,
      packet.timestamp,
    );
  }
}

export {
  BaseEvent,
  SystemStatusEvent,
  StatusUpdate,
  ZoneUpdate,
  MiscellaneousAlarmsUpdate,
  ArmingUpdate,
  OutputsUpdate,
  ViewStateUpdate,
  PanelVersionUpdate,
  AuxiliaryOutputsUpdate,
  Zone,
  EventType,
  RequestID,
};
