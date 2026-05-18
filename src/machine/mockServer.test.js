import { describe, it, expect, beforeEach } from 'vitest';
import { mockMachine } from '../machine/mockServer';
import { MachineState, SafetyState, FaultCode } from '../machine/constants';

describe('Mock Machine Simulator', () => {
  beforeEach(() => {
    mockMachine.disconnect();
    mockMachine.resetFault();
  });

  describe('Connection', () => {
    it('starts disconnected', () => {
      const state = mockMachine.getFullState();
      expect(state.connected).toBe(false);
      expect(state.state).toBe(MachineState.DISCONNECTED);
    });

    it('connects successfully', () => {
      mockMachine.connect();
      const state = mockMachine.getFullState();
      expect(state.connected).toBe(true);
      expect(state.state).toBe(MachineState.IDLE);
    });

    it('disconnects successfully', () => {
      mockMachine.connect();
      mockMachine.disconnect();
      const state = mockMachine.getFullState();
      expect(state.connected).toBe(false);
      expect(state.state).toBe(MachineState.DISCONNECTED);
    });
  });

  describe('Homing', () => {
    it('requires connection to home', () => {
      mockMachine.home();
      expect(mockMachine.getFullState().homed).toBe(false);
    });

    it('homes successfully when connected', () => {
      mockMachine.connect();
      mockMachine.home();
      // Homing takes 2 seconds, so state should be HOMING immediately
      expect(mockMachine.getFullState().state).toBe(MachineState.HOMING);
    });
  });

  describe('Safety', () => {
    it('starts with unclamped', () => {
      mockMachine.connect();
      const state = mockMachine.getFullState();
      expect(state.safety.clamp).toBe(SafetyState.UNCLAMPED);
    });

    it('can clamp material', () => {
      mockMachine.connect();
      mockMachine.clamp();
      expect(mockMachine.getFullState().safety.clamp).toBe(SafetyState.CLAMPED);
    });

    it('can unclamp material', () => {
      mockMachine.connect();
      mockMachine.clamp();
      mockMachine.unclamp();
      expect(mockMachine.getFullState().safety.clamp).toBe(SafetyState.UNCLAMPED);
    });
  });

  describe('Zero point', () => {
    it('sets zero point', () => {
      mockMachine.connect();
      mockMachine.setZero();
      const state = mockMachine.getFullState();
      expect(state.zeroPoint).toEqual({ x: 0, y: 0, z: 0 });
    });
  });

  describe('Jog', () => {
    it('jogs X axis', () => {
      mockMachine.connect();
      mockMachine.jog('x', 10);
      expect(mockMachine.getFullState().position.x).toBe(10);
    });

    it('jogs Y axis', () => {
      mockMachine.connect();
      mockMachine.jog('y', -5);
      expect(mockMachine.getFullState().position.y).toBe(-5);
    });

    it('jogs Z axis', () => {
      mockMachine.connect();
      mockMachine.jog('z', 2.5);
      expect(mockMachine.getFullState().position.z).toBe(2.5);
    });
  });

  describe('Fault handling', () => {
    it('can simulate a fault', () => {
      mockMachine.connect();
      mockMachine.simulateFault(FaultCode.OVERTEMP);
      const state = mockMachine.getFullState();
      expect(state.state).toBe(MachineState.FAULT);
      expect(state.fault).toBe(FaultCode.OVERTEMP);
    });

    it('can reset fault', () => {
      mockMachine.connect();
      mockMachine.simulateFault(FaultCode.OVERTEMP);
      mockMachine.resetFault();
      const state = mockMachine.getFullState();
      expect(state.state).toBe(MachineState.IDLE);
      expect(state.fault).toBe(FaultCode.NONE);
    });

    it('emergency stop sets correct state', () => {
      mockMachine.connect();
      mockMachine.emergencyStop();
      const state = mockMachine.getFullState();
      expect(state.state).toBe(MachineState.EMERGENCY_STOP);
    });

    it('can reset from emergency stop', () => {
      mockMachine.connect();
      mockMachine.emergencyStop();
      mockMachine.resetFault();
      const state = mockMachine.getFullState();
      expect(state.state).toBe(MachineState.IDLE);
    });
  });

  describe('Event listeners', () => {
    it('emits state_change on connection', () => {
      let emitted = null;
      mockMachine.on('state_change', (state) => { emitted = state; });
      mockMachine.connect();
      expect(emitted).not.toBeNull();
      expect(emitted.connected).toBe(true);
    });

    it('emits error on invalid action', () => {
      let emitted = null;
      mockMachine.on('error', (err) => { emitted = err; });
      mockMachine.clamp();
      expect(emitted).not.toBeNull();
      expect(emitted.message).toBe('Not connected');
    });

    it('removes listener when unsubscribed', () => {
      let callCount = 0;
      const handler = () => { callCount++; };
      const unsubscribe = mockMachine.on('state_change', handler);
      mockMachine.connect();
      expect(callCount).toBe(1);
      unsubscribe();
      mockMachine.disconnect();
      expect(callCount).toBe(1); // Should not increase
    });
  });
});
