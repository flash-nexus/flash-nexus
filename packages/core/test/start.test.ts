import type { DnsManager } from '@flash-dns/core'
import type { AdapterContext, TunnelHandle } from '@flash-tunnel/types'
import { describe, expect, it } from 'vitest'
import { createDnsPreparation } from '../src/start'

function createContext(): AdapterContext {
  return {
    sessionId: 'fn_test_session',
    cwd: process.cwd(),
    signal: new AbortController().signal,
    now: Date.now,
    logger: {
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
    },
  }
}

function createManager(calls: { desired?: unknown, removed?: unknown }): DnsManager<{ proxied?: boolean }> {
  return {
    plan: async () => {
      throw new Error('plan is not used by the preparation hook')
    },
    ensure: async (desired) => {
      calls.desired = desired
      return {
        action: 'created',
        record: {
          id: 'record-1',
          zoneId: 'zone-1',
          name: desired.name,
          type: desired.type,
          content: desired.content,
          ttl: 'auto',
          ownership: desired.owner,
          providerOptions: desired.providerOptions,
        },
        ref: {
          provider: 'cloudflare',
          zoneId: 'zone-1',
          recordId: 'record-1',
          owner: desired.owner,
          snapshot: {
            name: desired.name,
            type: desired.type,
            content: desired.content,
          },
        },
      }
    },
    remove: async (ref) => {
      calls.removed = ref
      return { action: 'removed' }
    },
  }
}

describe('createDnsPreparation', () => {
  it('ensures and removes the record owned by the tunnel session', async () => {
    const calls: { desired?: unknown, removed?: unknown } = {}
    const prepare = createDnsPreparation({
      manager: createManager(calls),
      hostname: 'preview.example.com',
      zone: 'example.com',
    })
    const handle: TunnelHandle = {
      provider: 'cloudflare',
      tunnelId: 'tunnel-1',
      name: 'preview',
      target: {
        type: 'CNAME',
        target: 'tunnel-1.cfargotunnel.com',
        proxied: true,
      },
      secrets: {},
    }

    const resource = await prepare(createContext(), handle)
    expect(calls.desired).toMatchObject({
      zone: 'example.com',
      name: 'preview.example.com',
      type: 'CNAME',
      content: 'tunnel-1.cfargotunnel.com',
      ttl: 'auto',
      owner: { application: 'flash-nexus', id: 'fn_test_session' },
      providerOptions: { proxied: true },
    })
    expect(resource).toMatchObject({
      provider: 'cloudflare',
      ref: { recordId: 'record-1' },
    })

    await resource.dispose()
    expect(calls.removed).toMatchObject({
      provider: 'cloudflare',
      recordId: 'record-1',
      owner: { application: 'flash-nexus', id: 'fn_test_session' },
    })
  })

  it('rejects a named tunnel without a provider target', async () => {
    const prepare = createDnsPreparation({
      manager: createManager({}),
      hostname: 'preview.example.com',
      zone: 'example.com',
    })
    const handle: TunnelHandle = {
      provider: 'cloudflare',
      tunnelId: 'tunnel-1',
      name: 'preview',
      secrets: {},
    }

    await expect(prepare(createContext(), handle)).rejects.toThrow('Named tunnel did not provide a DNS target')
  })
})
