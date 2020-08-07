import { Connection } from '../src/connection';
import { NessClient } from '../src/client';
import { Alarm } from '../src/alarm';
jest.mock('../src/connection');
jest.mock('../src/alarm');

let client: NessClient;

beforeEach(() => {
  (Connection as jest.Mock<Connection>).mockClear();
  ((Alarm as unknown) as jest.Mock<Alarm>).mockClear();
  client = new NessClient('', 0);
});

const getData = (buf: Buffer): Buffer => {
  return buf.slice(7, -4);
};

const mockConnectionInstance = () => {
  return (Connection as jest.Mock<Connection>).mock.instances[0];
};

const alarmInstance = () => {
  return ((Alarm as unknown) as jest.Mock<Alarm>).mock.instances[0];
};

const write = () => {
  return mockConnectionInstance().write as jest.Mock;
};

test('arm away', () => {
  client.armAway('1234');
  expect(write().mock.calls.length).toBe(1);
  expect(getData(write().mock.calls[0][0])).toStrictEqual(Buffer.from('A1234E'));
});

test('arm away without code', () => {
  client.armAway(null);
  expect(write().mock.calls.length).toBe(1);
  expect(getData(write().mock.calls[0][0])).toStrictEqual(Buffer.from('AE'));
});

test('arm home', () => {
  client.armHome('1234');
  expect(write().mock.calls.length).toBe(1);
  expect(getData(write().mock.calls[0][0])).toStrictEqual(Buffer.from('H1234E'));
});

test('arm home without code', () => {
  client.armHome(null);
  expect(write().mock.calls.length).toBe(1);
  expect(getData(write().mock.calls[0][0])).toStrictEqual(Buffer.from('HE'));
});

test('disarm', () => {
  client.disarm('1234');
  expect(write().mock.calls.length).toBe(1);
  expect(getData(write().mock.calls[0][0])).toStrictEqual(Buffer.from('1234E'));
});

test('panic', () => {
  client.panic('1234');
  expect(write().mock.calls.length).toBe(1);
  expect(getData(write().mock.calls[0][0])).toStrictEqual(Buffer.from('*1234#'));
});

test('aux on', () => {
  client.aux(1, true);

  expect(write().mock.calls.length).toBe(1);
  expect(getData(write().mock.calls[0][0])).toStrictEqual(Buffer.from('11*'));
});

test('aux off', () => {
  client.aux(1, false);

  expect(write().mock.calls.length).toBe(1);
  expect(getData(write().mock.calls[0][0])).toStrictEqual(Buffer.from('11#'));
});

test('update', () => {
  client.update();
  expect(write().mock.calls.length).toBe(2);
  expect(getData(write().mock.calls[0][0])).toStrictEqual(Buffer.from('S00'));
  expect(getData(write().mock.calls[1][0])).toStrictEqual(Buffer.from('S14'));
});

test('send command', () => {
  client.sendCommand('ABCDEFGHI');
  expect(write().mock.calls.length).toBe(1);
  expect(getData(write().mock.calls[0][0])).toStrictEqual(Buffer.from('ABCDEFGHI'));
});

test('send command has newlines', () => {
  client.sendCommand('A1234E');
  expect(write().mock.calls.length).toBe(1);
  expect(write().mock.calls[0][0].slice(-2)).toStrictEqual(Buffer.from('\r\n'));
});

test('send command 2', () => {
  client.sendCommand('FOOBARBAZ');
  expect(write().mock.calls.length).toBe(1);
  expect(getData(write().mock.calls[0][0])).toStrictEqual(Buffer.from('FOOBARBAZ'));
});

test('on state change callback is registered', () => {
  const callback = jest.fn();
  client.onStateChange(callback);
  const onStateChangeCalls = (alarmInstance().onStateChange as jest.Mock).mock.calls;
  expect(onStateChangeCalls.length).toBe(1);
  expect(onStateChangeCalls[0][0]).toBe(callback);
});

test('on zone event callback is registered', () => {
  const callback = jest.fn();
  client.onZoneChange(callback);
  const onZoneEventCalls = (alarmInstance().onZoneChange as jest.Mock).mock.calls;
  expect(onZoneEventCalls.length).toBe(1);
  expect(onZoneEventCalls[0][0]).toBe(callback);
});

test('disconnect', () => {
  client.disconnect();
  expect((mockConnectionInstance().disconnect as jest.Mock).mock.calls.length).toBe(1);
});
