import { describe, it, expect, vi } from 'vitest';
import { EventBus, eventBus } from '../Managers/EventBus.js';

describe('EventBus', () => {
    it('emits to registered handlers in order', () => {
        const bus = new EventBus();
        const calls = [];
        bus.on('test', (v) => calls.push('a:' + v));
        bus.on('test', (v) => calls.push('b:' + v));
        bus.emit('test', 42);
        expect(calls).toEqual(['a:42', 'b:42']);
    });

    it('off() unsubscribes a single handler', () => {
        const bus = new EventBus();
        const fn1 = vi.fn();
        const fn2 = vi.fn();
        bus.on('e', fn1);
        bus.on('e', fn2);
        bus.off('e', fn1);
        bus.emit('e');
        expect(fn1).not.toHaveBeenCalled();
        expect(fn2).toHaveBeenCalledOnce();
    });

    it('on() returns an unsubscribe function', () => {
        const bus = new EventBus();
        const fn = vi.fn();
        const off = bus.on('e', fn);
        off();
        bus.emit('e');
        expect(fn).not.toHaveBeenCalled();
    });

    it('once() fires exactly one time', () => {
        const bus = new EventBus();
        const fn = vi.fn();
        bus.once('boom', fn);
        bus.emit('boom', 1);
        bus.emit('boom', 2);
        expect(fn).toHaveBeenCalledOnce();
        expect(fn).toHaveBeenCalledWith(1);
    });

    it('emit() with no handlers is a noop', () => {
        const bus = new EventBus();
        expect(() => bus.emit('ghost', 1, 2, 3)).not.toThrow();
    });

    it('thrown handlers do not abort sibling handlers', () => {
        const bus = new EventBus();
        const fnA = vi.fn(() => { throw new Error('boom'); });
        const fnB = vi.fn();
        bus.on('e', fnA);
        bus.on('e', fnB);
        const consoleErr = vi.spyOn(console, 'error').mockImplementation(() => {});
        bus.emit('e');
        expect(fnA).toHaveBeenCalled();
        expect(fnB).toHaveBeenCalled();
        expect(consoleErr).toHaveBeenCalled();
        consoleErr.mockRestore();
    });

    it('handler can off() itself during emit without skipping siblings', () => {
        const bus = new EventBus();
        const fnB = vi.fn();
        const fnA = vi.fn(() => bus.off('e', fnA));
        bus.on('e', fnA);
        bus.on('e', fnB);
        bus.emit('e');
        expect(fnA).toHaveBeenCalledOnce();
        expect(fnB).toHaveBeenCalledOnce();
        // Second emit — fnA already detached
        bus.emit('e');
        expect(fnA).toHaveBeenCalledOnce();
        expect(fnB).toHaveBeenCalledTimes(2);
    });

    it('clear() removes all handlers across all events', () => {
        const bus = new EventBus();
        bus.on('a', () => {});
        bus.on('b', () => {});
        bus.clear();
        expect(bus.stats()).toEqual({});
    });

    it('stats() reports handler counts per event', () => {
        const bus = new EventBus();
        bus.on('a', () => {});
        bus.on('a', () => {});
        bus.on('b', () => {});
        expect(bus.stats()).toEqual({ a: 2, b: 1 });
    });

    it('exported singleton is a working EventBus instance', () => {
        const fn = vi.fn();
        const off = eventBus.on('singleton:test', fn);
        eventBus.emit('singleton:test', 'ok');
        expect(fn).toHaveBeenCalledWith('ok');
        off();
    });
});
