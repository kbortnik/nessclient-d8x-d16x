import { EventType, ArmingStatus } from './event-types';
import { ArmingUpdate, SystemStatusEvent, BaseEvent, ZoneUpdate, Zone } from './event';
import { EventDispatcher, Handler } from './event-handling';

enum ArmingState {
  UNKNOWN = 'UNKNOWN',
  DISARMED = 'DISARMED',
  ARMING = 'ARMING',
  EXIT_DELAY = 'EXIT_DELAY',
  ARMED_HOME = 'ARMED_HOME',
  ARMED_AWAY = 'ARMED_AWAY',
  ARMED_NIGHT = 'ARMED_NIGHT',
  ENTRY_DELAY = 'ENTRY_DELAY',
  TRIGGERED = 'TRIGGERED',
}

class AlarmZone {
  constructor(public triggered: boolean | null) {}
}

class Alarm {
  public static ArmEvents: EventType[] = [
    EventType.ARMED_AWAY,
    EventType.ARMED_HOME,
    EventType.ARMED_DAY,
    EventType.ARMED_NIGHT,
    EventType.ARMED_VACATION,
    EventType.ARMED_HIGHEST,
  ];

  private _inferArmingState: boolean;
  private _stateChangeEventDispatcher = new EventDispatcher<ArmingState>();
  private _zoneChangeEventDispatcher = new EventDispatcher<[number, boolean]>();

  /**
   * Current arming state
   */
  public armingState: ArmingState;
  /**
   * Expected arming state.
   * This is the arming state we expect
   * after an 'exit delay' or 'alarm restore'
   */
  public expectedArmingState: ArmingState;
  public zones: AlarmZone[];

  constructor(inferArmingState = false) {
    this._inferArmingState = inferArmingState;
    this.armingState = ArmingState.UNKNOWN;
    this.expectedArmingState = ArmingState.UNKNOWN;
    this.zones = [...Array(16)].map(() => new AlarmZone(null));
  }

  public onStateChange(handler: Handler<ArmingState>): void {
    this._stateChangeEventDispatcher.register(handler);
  }

  public onZoneChange(handler: Handler<[number, boolean]>): void {
    this._zoneChangeEventDispatcher.register(handler);
  }

  public handleEvent<T extends BaseEvent>(event: T): void {
    if (event instanceof ArmingUpdate) {
      this.handleArmingUpdate(event);
    } else if (event instanceof ZoneUpdate) {
      this.handleZoneInputUpdate(event);
    } else if (event instanceof SystemStatusEvent) {
      this.handleSystemStatusEvent(event);
    }
  }

  private handleArmingUpdate(update: ArmingUpdate) {
    if (update.status.length > 0 && update.status.every((status) => status == ArmingStatus.AREA_1_ARMED)) {
      this.updateArmingState(ArmingState.EXIT_DELAY);
      return;
    }
    if (update.status.includes(ArmingStatus.AREA_1_ARMED) && update.status.includes(ArmingStatus.AREA_1_FULLY_ARMED)) {
      this.updateArmingState(ArmingState.ARMED_AWAY);
    } else if (update.status.includes(ArmingStatus.HOME_ARMED)) {
      this.updateArmingState(ArmingState.ARMED_HOME);
    } else {
      if (this._inferArmingState) {
        /*
        State inference is enabled. Therefore the arming state can
        only be reverted to disarmed via a system status event.
        This works around a bug with some panels (<v5.8) which emit
        update.status = [] when they are armed.
        */
        if (this.armingState == ArmingState.UNKNOWN) {
          this.updateArmingState(ArmingState.DISARMED);
        }
      } else {
        /*
        State inference is disabled, therefore we can assume the
        panel is "disarmed" as it did not have any arming flags set
        in the arming update status as per the documentation.
        Note: This may not be correct and may not correctly represent
        other modes of arming other than ARMED_AWAY.
        */
        this.updateArmingState(ArmingState.DISARMED);
      }
    }
  }

  private handleZoneInputUpdate(update: ZoneUpdate): void {
    this.zones.forEach((item, index) => {
      const zoneId = index + 1;
      const name = `ZONE_${zoneId}`;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.updateZone(zoneId, update.includedZones.includes((<any>Zone)[name]));
    });
  }

  private handleSystemStatusEvent(event: SystemStatusEvent) {
    /*
    DISARMED -> ARMED_AWAY -> EXIT_DELAY_START -> EXIT_DELAY_END
    (trip): -> ALARM -> OUTPUT_ON -> ALARM_RESTORE
    (disarm): -> DISARMED -> OUTPUT_OFF
    (disarm): -> DISARMED
    (disarm before EXIT_DELAY_END): -> DISARMED -> EXIT_DELAY_END
    */

    if (event.type == EventType.UNSEALED) {
      this.updateZone(event.zone, true);
    } else if (event.type == EventType.SEALED) {
      this.updateZone(event.zone, false);
    } else if (event.type == EventType.ALARM) {
      this.updateArmingState(ArmingState.TRIGGERED);
    } else if (event.type == EventType.ALARM_RESTORE) {
      if (this.armingState != ArmingState.DISARMED) {
        this.updateArmingState(this.expectedArmingState);
      }
    } else if (event.type == EventType.ENTRY_DELAY_START) {
      this.updateArmingState(ArmingState.ENTRY_DELAY);
    } else if (event.type == EventType.ENTRY_DELAY_END) {
      // Do nothing
    } else if (event.type == EventType.EXIT_DELAY_START) {
      this.updateArmingState(ArmingState.EXIT_DELAY);
    } else if (event.type == EventType.EXIT_DELAY_END) {
      /*
        Exit delay finished - if we were in the
        process of arming, update the state to
        the expected arming state
        */
      if (this.armingState == ArmingState.EXIT_DELAY) {
        this.updateArmingState(this.expectedArmingState);
      }
    } else if (Alarm.ArmEvents.includes(event.type)) {
      this.updateArmingState(ArmingState.ARMING);
      if (event.type == EventType.ARMED_HOME) {
        this.expectedArmingState = ArmingState.ARMED_HOME;
      } else if (event.type == EventType.ARMED_NIGHT) {
        this.expectedArmingState = ArmingState.ARMED_NIGHT;
      } else {
        this.expectedArmingState = ArmingState.ARMED_AWAY;
      }
    } else if (event.type == EventType.DISARMED) {
      this.updateArmingState(ArmingState.DISARMED);
    } else if (event.type == EventType.ARMING_DELAYED) {
      // Do nothing
    }
  }

  private updateArmingState(state: ArmingState): void {
    if (this.armingState != state) {
      this.armingState = state;
      this._stateChangeEventDispatcher.fire(state);
    }
  }

  private updateZone(zoneId: number, state: boolean): void {
    const zone = this.zones[zoneId - 1];
    if (zone.triggered != state) {
      zone.triggered = state;
      this._zoneChangeEventDispatcher.fire([zoneId, state]);
    }
  }
}

export { Alarm, ArmingState };
