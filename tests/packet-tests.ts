import { Packet, CommandType } from '../src/packet';

test('decode encode', () => {
  const testCases = ['8300c6012345678912EE7'];
  for (const testCase of testCases) {
    // Skip checksum validation, as we can't
    // guarantee that the packet data
    // is genuine
    const packet = Packet.decode(testCase, true);
    expect(testCase).toBe(packet.encode());
  }
});

test('system status packet decode', () => {
  // Skip checksum validation, as we can't
  // guarantee that the packet data
  // is genuine
  const packet = Packet.decode('8700036100070018092118370974', true);
  expect(packet.start).toBe(0x87);
  expect(packet.address).toBe(0x00);
  expect(packet.seq).toBe(0x00);
  expect(packet.length).toBe(3);
  expect(packet.command).toBe(CommandType.SYSTEM_STATUS);
  expect(packet.data).toBe('000700');
  expect(packet.timestamp?.getTime()).toBe(new Date(2018, 8, 21, 18, 37, 9).getTime());
});

test('decode with address and timestamp', () => {
  // Skip checksum validation, as we can't
  // guarantee that the packet data
  // is genuine
  const packet = Packet.decode('8709036101050018122709413536', true);
  expect(packet.address).toBe(0x09);
  expect(packet.seq).toBe(0x00);
  expect(packet.length).toBe(3);
  expect(packet.command).toBe(CommandType.SYSTEM_STATUS);
  expect(packet.data).toBe('010500');
  expect(packet.timestamp?.getTime()).toBe(new Date(2018, 11, 27, 9, 41, 35).getTime());
});

test('encode with address and timestamp', () => {
  const packet = new Packet(0x09, 0x00, CommandType.SYSTEM_STATUS, '010500', new Date(2018, 11, 27, 9, 41, 35));
  expect(packet.encode()).toBe('87090361010500181227094135CD');
});

test('encode decode keypad string', () => {
  const packet = new Packet(0x00, 0x00, CommandType.USER_INTERFACE, 'A1234E', null);
  expect(packet.length).toBe(6);
  expect(packet.encode()).toBe('8300660A1234E49');
});

test('encode decode', () => {
  const packet = new Packet(0x00, 0x00, CommandType.USER_INTERFACE, '000100', new Date(2018, 4, 10, 15, 32, 55));
  expect(packet.length).toBe(3);
  expect(packet.encode()).toBe('87000360000100180510153255E3');
});

test('decode status update response', () => {
  const packet = Packet.decode('8200036007000014');
  expect(packet.start).toBe(0x82);
  expect(packet.address).toBe(0x00);
  expect(packet.length).toBe(3);
  expect(packet.seq).toBe(0x00);
  expect(packet.command).toBe(CommandType.USER_INTERFACE);
  expect(packet.data).toBe('070000');
  expect(packet.timestamp).toBeNull();
  //expect(packet.checksum).toBe(?);
});

test('bad timestamp', () => {
  // Skip checksum validation, as we can't
  // guarantee that the packet data
  // is genuine
  const packet = Packet.decode('8700036100070019022517600057', true);
  expect(packet.start).toBe(0x87);
  expect(packet.address).toBe(0x00);
  expect(packet.length).toBe(3);
  expect(packet.seq).toBe(0x00);
  expect(packet.command).toBe(CommandType.SYSTEM_STATUS);
  expect(packet.data).toBe('000700');
  expect(packet.timestamp?.getTime()).toBe(new Date(2019, 1, 25, 18, 0, 0).getTime());
});
