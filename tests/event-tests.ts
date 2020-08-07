import { CommandType, Packet } from '../src/packet';
import {
  BaseEvent,
  SystemStatusEvent,
  StatusUpdate,
  ZoneUpdate,
  Zone,
  RequestID,
  MiscellaneousAlarmsUpdate,
  ArmingUpdate,
  OutputsUpdate,
  ViewStateUpdate,
  PanelVersionUpdate,
  AuxiliaryOutputsUpdate,
} from '../src/event';
import { Model, ArmingStatus } from '../src/event-types';

const makePacket = (command: CommandType, data: string): Packet => {
  return new Packet(0, 0, command, data, null, true);
};

describe('base event', () => {
  test('decode system status event', () => {
    const packet = makePacket(CommandType.SYSTEM_STATUS, '000000');
    const event = BaseEvent.decode(packet);
    expect(event).toBeInstanceOf(SystemStatusEvent);
  });

  test('decode user interface event', () => {
    const packet = makePacket(CommandType.USER_INTERFACE, '000000');
    const event = BaseEvent.decode(packet);
    expect(event).toBeInstanceOf(StatusUpdate);
  });

  test('decode unknown event', () => {
    const packet = makePacket(0x01, '000000');
    expect(() => {
      BaseEvent.decode(packet);
    }).toThrowError(/unknown command/i);
  });
});

describe('status update', () => {
  test('decode zone update is the correct type', () => {
    const packet = makePacket(CommandType.USER_INTERFACE, '000000');
    const event = StatusUpdate.decode(packet);
    expect(event).toBeInstanceOf(ZoneUpdate);
  });
  test('decode zone update includes the correct zones', () => {
    const packet = makePacket(CommandType.USER_INTERFACE, '000500');
    const event = StatusUpdate.decode(packet);
    expect((<ZoneUpdate>event).includedZones).toContain(Zone.ZONE_1);
    expect((<ZoneUpdate>event).includedZones).toContain(Zone.ZONE_3);
  });
  test('decode misc alarms update', () => {
    const packet = makePacket(CommandType.USER_INTERFACE, '130000');
    const event = StatusUpdate.decode(packet);
    expect(event).toBeInstanceOf(MiscellaneousAlarmsUpdate);
  });
  test('decode arming update', () => {
    const packet = makePacket(CommandType.USER_INTERFACE, '140000');
    const event = StatusUpdate.decode(packet);
    expect(event).toBeInstanceOf(ArmingUpdate);
  });
  test('decode outputs update', () => {
    const packet = makePacket(CommandType.USER_INTERFACE, '150000');
    const event = StatusUpdate.decode(packet);
    expect(event).toBeInstanceOf(OutputsUpdate);
  });
  test('decode view state update', () => {
    const packet = makePacket(CommandType.USER_INTERFACE, '16f000');
    const event = StatusUpdate.decode(packet);
    expect(event).toBeInstanceOf(ViewStateUpdate);
  });
  test('decode panel version update', () => {
    const packet = makePacket(CommandType.USER_INTERFACE, '170000');
    const event = StatusUpdate.decode(packet);
    expect(event).toBeInstanceOf(PanelVersionUpdate);
  });
  test('decode auxiliary outputs update', () => {
    const packet = makePacket(CommandType.USER_INTERFACE, '180000');
    const event = StatusUpdate.decode(packet);
    expect(event).toBeInstanceOf(AuxiliaryOutputsUpdate);
  });
  test('decode unknown update', () => {
    const packet = makePacket(CommandType.USER_INTERFACE, '550000');
    expect(() => {
      StatusUpdate.decode(packet);
    }).toThrowError(RegExp(/unhandled requestId/i));
  });
});

describe('arming update', () => {
  test('encode', () => {
    const event = new ArmingUpdate([ArmingStatus.AREA_1_FULLY_ARMED], 0x00, null);
    const packet = event.encode();
    expect(packet.command).toBe(CommandType.USER_INTERFACE);
    expect(packet.data).toBe('140400');
    expect(packet.isUserInterfaceResponse).toBeTruthy();
  });
  test('area1 armed', () => {
    const packet = makePacket(CommandType.USER_INTERFACE, '140500');
    const event = ArmingUpdate.decode(packet);
    expect(event.status).toStrictEqual([ArmingStatus.AREA_1_ARMED, ArmingStatus.AREA_1_FULLY_ARMED]);
  });
});

describe('zone update', () => {
  test('encode', () => {
    const event = new ZoneUpdate([Zone.ZONE_1, Zone.ZONE_3], RequestID.ZONE_INPUT_UNSEALED, 0x00, null);
    const packet = event.encode();
    expect(packet.command).toBe(CommandType.USER_INTERFACE);
    expect(packet.data).toBe('000500');
    expect(packet.isUserInterfaceResponse).toBeTruthy();
  });
});

describe('panel version update', () => {
  test('model', () => {
    const packet = makePacket(CommandType.USER_INTERFACE, '160000');
    const event = PanelVersionUpdate.decode(packet);
    expect(event.model).toBe(Model.D16X);
  });
  test('3g model', () => {
    const packet = makePacket(CommandType.USER_INTERFACE, '160400');
    const event = PanelVersionUpdate.decode(packet);
    expect(event.model).toBe(Model.D16X_3G);
  });
  test('sw version', () => {
    const packet = makePacket(CommandType.USER_INTERFACE, '160086');
    const event = PanelVersionUpdate.decode(packet);
    expect(event.majorVersion).toBe(8);
    expect(event.minorVersion).toBe(6);
    expect(event.version).toBe('8.6');
  });
});
