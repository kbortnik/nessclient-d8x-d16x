enum CommandType {
  SYSTEM_STATUS = 0x61,
  USER_INTERFACE = 0x60,
}

class PacketUtils {
  /**
   *
   * @param start Value of the START byte
   */
  static isUserInterfaceReq(start: number): boolean {
    return start == 0x83;
  }

  static isUserInterfaceResp(start: number): boolean {
    return start == 0x82;
  }

  /**
   * Determine whether the packet has an "address" encoded into it.
   * There exists an undocumented bug/edge case in the spec - some packets
   * with 0x82 as _start_, still encode the address into the packet, and thus
   * throws off decoding. This edge case is handled explicitly.
   * @param start Value of the START byte
   * @param dataLength Length of the entire message
   */
  static hasAddress(start: number, dataLength: number): boolean {
    return !!(0x01 & start) || (start == 0x82 && dataLength == 16);
  }

  /**
   * Determine whether the packet has a timestamp encoded into it.
   * @param start Value of the START byte
   */
  static hasTimestamp(start: number): boolean {
    return !!(0x04 & start);
  }

  static toHex(value: number, pad = true): string {
    const hexValue = value.toString(16);
    return pad ? hexValue.padStart(2, '0') : hexValue;
  }

  static leftPad(val: number, resultLength = 2, leftPadChar = '0'): string {
    return (String(leftPadChar).repeat(resultLength) + String(val)).slice(String(val).length);
  }

  /**
   * YY MM DD HH MM SS
   * @param date Date
   */
  static formatTimestamp(date: Date): string {
    return (
      date.getFullYear().toString().substring(2, 4) +
      this.leftPad(date.getMonth() + 1, 2) +
      this.leftPad(date.getDate(), 2) +
      this.leftPad(date.getHours(), 2) +
      this.leftPad(date.getMinutes(), 2) +
      this.leftPad(date.getSeconds(), 2)
    );
  }
}

/**
 * Class that helps with iterating through a data packet.
 */
class DataIterator {
  private position: number;
  private data: string;
  private checksumBytes = 0;

  constructor(data: string) {
    this.data = data;
    this.position = 0;
  }

  /**
   * Returns `true` if checksum validation
   * has passed. This property is valid only
   * if all data has been iterated
   */
  public get validChecksum() {
    return this.checksumBytes % 1 === 0;
  }

  takeHex(half = false): number {
    const val = parseInt(this.takeBytes(1, half), 16);
    this.checksumBytes += val;
    return val;
  }

  takeBytes(n: number, half = false, includeInChecksum = false): string {
    // Typically, take 2 bytes
    // unless 'half' is specified
    const multi = half ? 1 : 2;
    const position = this.position;
    this.position += n * multi;
    if (this.position > this.data.length) {
      throw new Error('Unable to take more data than exists');
    }

    const slicedData = this.data.slice(position, this.position);

    if (includeInChecksum) {
      for (let i = 0; i + 2 <= n + 2; i += 2) {
        this.checksumBytes += parseInt(slicedData.slice(i, i + 2), 16);
      }
    }

    return slicedData;
  }

  /**
   * Decode timestamp using bespoke decoder.
   * The Ness panel contains a bug that P199E zone and state updates emitted
   * on the hour cause a minute value of `60` to be sent.
   * This decoder handles this edge case.
   */
  decodeTimestamp(): Date {
    const data = this.takeBytes(6);

    const yearData = parseInt(data.slice(0, 2));
    const year = 2000 + yearData;
    // Zero-based month index
    const monthData = parseInt(data.slice(2, 4));
    const month = monthData - 1;
    const day = parseInt(data.slice(4, 6));

    let hour = parseInt(data.slice(6, 8));
    let minute = parseInt(data.slice(8, 10));
    const second = parseInt(data.slice(10, 12));

    this.checksumBytes += yearData + monthData + day + hour + minute + second;

    if (minute == 60) {
      minute = 0;
      hour += 1;
    }

    return new Date(year, month, day, hour, minute, second);
  }

  isConsumed(): boolean {
    return this.position >= this.data.length;
  }
}

class Packet {
  private readonly _seq: number;

  public readonly data: string;
  public readonly address: number | null;
  public readonly timestamp: Date | null;
  public readonly command: CommandType;
  /**
   * Whether or not this packet is a USER_INTERFACE response
   */
  public readonly isUserInterfaceResponse: boolean;

  get start(): number {
    let rv = 0x02 | 0x80;
    if (this.address != null && !this.isUserInterfaceResponse) {
      rv |= 0x01;
    }
    if (this.timestamp != null) {
      rv |= 0x04;
    }
    return rv;
  }

  get seq(): number {
    return this._seq;
  }

  get length(): number {
    if (PacketUtils.isUserInterfaceReq(this.start)) {
      return this.data.length;
    } else {
      return Math.trunc(this.data.length / 2);
    }
  }

  get lengthField(): number {
    return this.length | (this._seq << 7);
  }

  get calculatedChecksum(): number {
    const bytes = this.encode(false);
    const total = bytes.split('').reduce((acc: number, val: string) => acc + val.charCodeAt(0), 0) & 0xff;
    return (256 - total) % 256;
  }

  public constructor(
    address: number | null,
    seq: number,
    command: CommandType,
    data: string,
    timestamp: Date | null,
    isUserIntefaceResp = false,
  ) {
    this.address = address;
    this._seq = seq;
    this.command = command;
    this.data = data;
    this.timestamp = timestamp;
    this.isUserInterfaceResponse = isUserIntefaceResp;
  }

  public encode(withChecksum = true): string {
    let data = PacketUtils.toHex(this.start);

    if (this.address != null) {
      data += PacketUtils.toHex(this.address, !PacketUtils.isUserInterfaceReq(this.start));
    }

    data += PacketUtils.toHex(this.lengthField);
    data += PacketUtils.toHex(this.command);
    data += this.data;

    if (this.timestamp != null) {
      data += PacketUtils.formatTimestamp(this.timestamp);
    }

    if (withChecksum) {
      data += PacketUtils.toHex(this.calculatedChecksum).toUpperCase();
    }

    return data;
  }

  static decode(data: string, skipChecksumValidation = false): Packet {
    const iterator = new DataIterator(data);

    const start = iterator.takeHex();

    let address: number | null = null;
    if (PacketUtils.hasAddress(start, data.length)) {
      address = iterator.takeHex(PacketUtils.isUserInterfaceReq(start));
    }

    const length = iterator.takeHex();
    const dataLength = length & 0x7f;
    const seq = length >> 7;
    const commandIter = iterator.takeHex();
    const command: CommandType = commandIter;

    const msgData = iterator.takeBytes(dataLength, PacketUtils.isUserInterfaceReq(start), true);

    let timestamp: Date | null = null;
    if (PacketUtils.hasTimestamp(start)) {
      timestamp = iterator.decodeTimestamp();
    }

    // Take the last hex value.
    // The value is not important to us,
    // but the DataIterator uses it for
    // determining checksum validity.
    iterator.takeHex();

    if (!skipChecksumValidation && !iterator.validChecksum) {
      throw new Error('Invalid checksum in received packet');
    }

    if (!iterator.isConsumed()) {
      throw new Error('Unable to consume all data');
    }

    return new Packet(
      address,
      seq,
      command,
      msgData,
      timestamp,
      PacketUtils.isUserInterfaceResp(start) && command == CommandType.USER_INTERFACE,
    );
  }
}

export { Packet, PacketUtils, CommandType };
