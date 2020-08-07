/**
 * Event type
 */
enum EventType {
  /* Zone/User Events */
  UNSEALED = 0x00,
  SEALED = 0x01,
  ALARM = 0x02,
  ALARM_RESTORE = 0x03,
  MANUAL_EXCLUDE = 0x04,
  MANUAL_INCLUDE = 0x05,
  AUTO_EXCLUDE = 0x06,
  AUTO_INCLUDE = 0x07,
  TAMPER_UNSEALED = 0x08,
  TAMPER_NORMAL = 0x09,

  /* System Events */
  POWER_FAILURE = 0x10,
  POWER_NORMAL = 0x11,
  BATTERY_FAILURE = 0x12,
  BATTERY_NORMAL = 0x13,
  REPORT_FAILURE = 0x14,
  REPORT_NORMAL = 0x15,
  SUPERVISION_FAILURE = 0x16,
  SUPERVISION_NORMAL = 0x17,
  REAL_TIME_CLOCK = 0x19,

  /* Area Events */
  ENTRY_DELAY_START = 0x20,
  ENTRY_DELAY_END = 0x21,
  EXIT_DELAY_START = 0x22,
  EXIT_DELAY_END = 0x23,
  ARMED_AWAY = 0x24,
  ARMED_HOME = 0x25,
  ARMED_DAY = 0x26,
  ARMED_NIGHT = 0x27,
  ARMED_VACATION = 0x28,
  ARMED_HIGHEST = 0x2e,
  DISARMED = 0x2f,
  ARMING_DELAYED = 0x30,

  /* Result Events */
  OUTPUT_ON = 0x31,
  OUTPUT_OFF = 0x32,
}

/**
 * Alarm type
 * 
 * **Note:** The Ness provided documentation has the byte endianness
    incorrectly documented. For this reason, these enum values have
    reversed byte ordering compared to the Ness provided documentation.
    This only applies to some enums, and thus must be applied on a
    case-by-case basis
 */
enum AlarmType {
  DURESS = 0x0100,
  PANIC = 0x0200,
  MEDICAL = 0x0400,
  FIRE = 0x0800,
  INSTALL_END = 0x1000,
  EXT_TAMPER = 0x2000,
  PANEL_TAMPER = 0x4000,
  KEYPAD_TAMPER = 0x8000,
  PENDANT_PANIC = 0x0001,
  PANEL_BATTERY_LOW = 0x0002,
  PANEL_BATTERY_LOW2 = 0x0004,
  MAINS_FAIL = 0x0008,
  CBUS_FAIL = 0x0010,
}

/**
 * Arming status
 * 
 * **Note:** The Ness provided documentation has the byte endianness
    incorrectly documented. For this reason, these enum values have
    reversed byte ordering compared to the Ness provided documentation.
    This only applies to some enums, and thus must be applied on a
    case-by-case basis
 */
enum ArmingStatus {
  AREA_1_ARMED = 0x0100,
  AREA_2_ARMED = 0x0200,
  AREA_1_FULLY_ARMED = 0x0400,
  AREA_2_FULLY_ARMED = 0x0800,
  HOME_ARMED = 0x1000,
  DAY_MODE_ARMED = 0x2000,
  ENTRY_DELAY_1_ON = 0x4000,
  ENTRY_DELAY_2_ON = 0x8000,
  MANUAL_EXCLUDE_MODE = 0x0001,
  MEMORY_MODE = 0x0002,
  DAY_ZONE_SELECT = 0x0004,
}

/**
 * Output type
 * 
 * **Note:** The Ness provided documentation has the byte endianness
    incorrectly documented. For this reason, these enum values have
    reversed byte ordering compared to the Ness provided documentation.
    This only applies to some enums, and thus must be applied on a
    case-by-case basis
 */
enum OutputType {
  SIREN_LOUD = 0x0100,
  SIREN_SOFT = 0x0200,
  SIREN_SOFT_MONITOR = 0x0400,
  SIREN_SOFT_FIRE = 0x0800,
  STROBE = 0x1000,
  RESET = 0x2000,
  SONALART = 0x4000,
  KEYPAD_DISPLAY_ENABLE = 0x8000,
  AUX1 = 0x0001,
  AUX2 = 0x0002,
  AUX3 = 0x0004,
  AUX4 = 0x0008,
  MONITOR_OUT = 0x0010,
  POWER_FAIL = 0x0020,
  PANEL_BATT_FAIL = 0x0040,
  TAMPER_XPAND = 0x0080,
}

/**
 * State
 */
enum State {
  NORMAL = 0xf000,
  BRIEF_DAY_CHIME = 0xe000,
  HOME = 0xd000,
  MEMORY = 0xc000,
  BRIEF_DAY_ZONE_SELECT = 0xb000,
  EXCLUDE_SELECT = 0xa000,
  USER_PROGRAM = 0x9000,
  INSTALLER_PROGRAM = 0x8000,
}

/**
 * Model
 */
enum Model {
  D16X = 0x00,
  D16X_3G = 0x04,
}

/**
 * Auxiliary output type
 */
enum AuxiliaryOutputType {
  AUX_1 = 0x0001,
  AUX_2 = 0x0002,
  AUX_3 = 0x0004,
  AUX_4 = 0x0008,
  AUX_5 = 0x0010,
  AUX_6 = 0x0020,
  AUX_7 = 0x0040,
  AUX_8 = 0x0080,
}

export { EventType, AlarmType, ArmingStatus, OutputType, State, Model, AuxiliaryOutputType };
