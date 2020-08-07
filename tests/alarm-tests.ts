import { Alarm, ArmingState } from '../src/alarm';
import { ArmingUpdate, SystemStatusEvent, ZoneUpdate, Zone, RequestID } from '../src/event';
import { ArmingStatus, EventType } from '../src/event-types';

test('state is initially unknown', () => {
  expect(new Alarm().armingState).toBe(ArmingState.UNKNOWN);
});

test('zones are initially unknown', () => {
  const alarm = new Alarm();
  for (const zone of alarm.zones) {
    expect(zone.triggered).toBeNull();
  }
});

test('16 zones are created', () => {
  expect(new Alarm().zones.length).toBe(16);
});

test('handle event zone update', () => {
  const alarm = new Alarm();
  const event = new ZoneUpdate([Zone.ZONE_1, Zone.ZONE_3], RequestID.ZONE_INPUT_UNSEALED, null, null);
  alarm.handleEvent(event);
  expect(alarm.zones[0].triggered).toBe(true);
  expect(alarm.zones[1].triggered).toBe(false);
  expect(alarm.zones[2].triggered).toBe(true);
});

test('handle event zone update sealed', () => {
  const alarm = new Alarm();
  alarm.zones[0].triggered = true;
  alarm.zones[1].triggered = true;

  const event = new ZoneUpdate([Zone.ZONE_1, Zone.ZONE_3], RequestID.ZONE_INPUT_UNSEALED, null, null);
  alarm.handleEvent(event);
  expect(alarm.zones[0].triggered).toBe(true);
  expect(alarm.zones[1].triggered).toBe(false);
  expect(alarm.zones[2].triggered).toBe(true);
});

test('handle event zone update callback', () => {
  const alarm = new Alarm();
  alarm.zones.forEach((zone) => {
    zone.triggered = false;
  });
  alarm.zones[3].triggered = true;

  const callback = jest.fn();
  alarm.onZoneChange(callback);
  const event = new ZoneUpdate([Zone.ZONE_1, Zone.ZONE_3], RequestID.ZONE_INPUT_UNSEALED, null, null);
  alarm.handleEvent(event);
  expect(callback.mock.calls.length).toBe(3);
  expect(callback.mock.calls[0][0]).toStrictEqual([1, true]);
  expect(callback.mock.calls[1][0]).toStrictEqual([3, true]);
  expect(callback.mock.calls[2][0]).toStrictEqual([4, false]);
});

test('handle event arming update exit delay', () => {
  const alarm = new Alarm();
  const event = new ArmingUpdate([ArmingStatus.AREA_1_ARMED], null, null);
  alarm.handleEvent(event);
  expect(alarm.armingState).toBe(ArmingState.EXIT_DELAY);
});

test('handle event arming update fully armed', () => {
  const alarm = new Alarm();
  const event = new ArmingUpdate([ArmingStatus.AREA_1_ARMED, ArmingStatus.AREA_1_FULLY_ARMED], null, null);
  alarm.handleEvent(event);
  expect(alarm.armingState).toBe(ArmingState.ARMED_AWAY);
});

test('handle event arming update home armed', () => {
  const alarm = new Alarm();
  const event = new ArmingUpdate([ArmingStatus.HOME_ARMED], null, null);
  alarm.handleEvent(event);
  expect(alarm.armingState).toBe(ArmingState.ARMED_HOME);
});

test('handle event arming update disarmed', () => {
  const alarm = new Alarm();
  const event = new ArmingUpdate([], null, null);
  alarm.handleEvent(event);
  expect(alarm.armingState).toBe(ArmingState.DISARMED);
});

test('handle event arming update infer arming state armed empty', () => {
  const alarm = new Alarm(true);
  alarm.armingState = ArmingState.ARMED_AWAY;
  const event = new ArmingUpdate([], null, null);
  alarm.handleEvent(event);
  expect(alarm.armingState).toBe(ArmingState.ARMED_AWAY);
});

test('handle event arming update without infer arming state armed empty', () => {
  const alarm = new Alarm(false);
  alarm.armingState = ArmingState.ARMED_AWAY;
  const event = new ArmingUpdate([], null, null);
  alarm.handleEvent(event);
  expect(alarm.armingState).toBe(ArmingState.DISARMED);
});

test('handle event arming update infer arming state unknown empty', () => {
  const alarm = new Alarm(true);
  const event = new ArmingUpdate([], null, null);
  alarm.handleEvent(event);
  expect(alarm.armingState).toBe(ArmingState.DISARMED);
});

test('handle event arming update callback', () => {
  const callback = jest.fn();
  const alarm = new Alarm();
  alarm.onStateChange(callback);
  const event = new ArmingUpdate([ArmingStatus.AREA_1_ARMED], null, null);
  alarm.handleEvent(event);
  expect(callback.mock.calls.length).toBe(1);
  expect(callback.mock.calls[0][0]).toBe(ArmingState.EXIT_DELAY);
});

test('handle event system status unsealed zone', () => {
  const alarm = new Alarm();
  alarm.zones[0].triggered = false;
  const event = new SystemStatusEvent(EventType.UNSEALED, 1, 0, null, null);
  alarm.handleEvent(event);
  expect(alarm.zones[0].triggered).toBe(true);
});

test('handle event system status unsealed zone calls callback', () => {
  const alarm = new Alarm();
  const callback = jest.fn();
  alarm.onZoneChange(callback);
  const event = new SystemStatusEvent(EventType.UNSEALED, 1, 0, null, null);
  alarm.handleEvent(event);
  expect(callback.mock.calls.length).toBe(1);
  expect(callback.mock.calls[0][0]).toStrictEqual([1, true]);
});

test('handle event system status sealed zone', () => {
  const alarm = new Alarm();
  alarm.zones[0].triggered = true;
  const event = new SystemStatusEvent(EventType.SEALED, 1, 0, null, null);
  alarm.handleEvent(event);
  expect(alarm.zones[0].triggered).toBe(false);
});

test('handle event system status sealed zone calls callback', () => {
  const alarm = new Alarm();
  alarm.zones[0].triggered = true;
  const callback = jest.fn();
  alarm.onZoneChange(callback);
  const event = new SystemStatusEvent(EventType.SEALED, 1, 0, null, null);
  alarm.handleEvent(event);
  expect(callback.mock.calls.length).toBe(1);
  expect(callback.mock.calls[0][0]).toStrictEqual([1, false]);
});

test('handle event system status alarm', () => {
  const alarm = new Alarm();
  const event = new SystemStatusEvent(EventType.ALARM, 1, 0, null, null);
  alarm.handleEvent(event);
  expect(alarm.armingState).toBe(ArmingState.TRIGGERED);
});

test('handle event system status alarm restore while disarmed', () => {
  const alarm = new Alarm();
  alarm.armingState = ArmingState.DISARMED;
  const event = new SystemStatusEvent(EventType.ALARM_RESTORE, 1, 0, null, null);
  alarm.handleEvent(event);
  expect(alarm.armingState).toBe(ArmingState.DISARMED);
});

test('handle event system status alarm restore while triggered', () => {
  const alarm = new Alarm();
  alarm.armingState = ArmingState.TRIGGERED;
  alarm.expectedArmingState = ArmingState.ARMED_AWAY;
  const event = new SystemStatusEvent(EventType.ALARM_RESTORE, 1, 0, null, null);
  alarm.handleEvent(event);
  expect(alarm.armingState).toBe(ArmingState.ARMED_AWAY);
});

test('handle event system status entry delay start', () => {
  const alarm = new Alarm();
  const event = new SystemStatusEvent(EventType.ENTRY_DELAY_START, 1, 0, null, null);
  alarm.handleEvent(event);
  expect(alarm.armingState).toBe(ArmingState.ENTRY_DELAY);
});

test('handle event system status entry delay end', () => {
  /*
  We explicitly ignore entry delay end, since an additional
  arm event is generated, which is handled instead
  */
  const alarm = new Alarm();
  alarm.armingState = ArmingState.ENTRY_DELAY;
  const event = new SystemStatusEvent(EventType.ENTRY_DELAY_END, 1, 0, null, null);
  alarm.handleEvent(event);
  expect(alarm.armingState).toBe(ArmingState.ENTRY_DELAY);
});

test('handle event system status exit delay start', () => {
  const alarm = new Alarm();
  const event = new SystemStatusEvent(EventType.EXIT_DELAY_START, 1, 0, null, null);
  alarm.handleEvent(event);
  expect(alarm.armingState).toBe(ArmingState.EXIT_DELAY);
});

test('handle event system status exit delay end from exit delay', () => {
  const alarm = new Alarm();
  alarm.armingState = ArmingState.EXIT_DELAY;
  alarm.expectedArmingState = ArmingState.ARMED_AWAY;
  const event = new SystemStatusEvent(EventType.EXIT_DELAY_END, 1, 0, null, null);
  alarm.handleEvent(event);
  expect(alarm.armingState).toBe(ArmingState.ARMED_AWAY);
});

test('handle event system status exit delay end from armed', () => {
  const alarm = new Alarm();
  alarm.armingState = ArmingState.DISARMED;
  const event = new SystemStatusEvent(EventType.EXIT_DELAY_END, 1, 0, null, null);
  alarm.handleEvent(event);
  expect(alarm.armingState).toBe(ArmingState.DISARMED);
});

test('handle event system status arm events', () => {
  const alarm = new Alarm();
  for (const eventType of Alarm.ArmEvents) {
    alarm.armingState = ArmingState.DISARMED;
    const event = new SystemStatusEvent(eventType, 1, 0, null, null);
    expect(alarm.armingState).toBe(ArmingState.DISARMED);
    alarm.handleEvent(event);
    expect(alarm.armingState).toBe(ArmingState.ARMING);
  }
});

test('handle event system status disarmed', () => {
  const alarm = new Alarm();
  const event = new SystemStatusEvent(EventType.DISARMED, 1, 0, null, null);
  alarm.handleEvent(event);
  expect(alarm.armingState).toBe(ArmingState.DISARMED);
});

test('handle event system status arming delayed', () => {
  const alarm = new Alarm();
  const event = new SystemStatusEvent(EventType.ARMING_DELAYED, 1, 0, null, null);
  alarm.handleEvent(event);
  expect(alarm.armingState).toBe(ArmingState.UNKNOWN);
});
