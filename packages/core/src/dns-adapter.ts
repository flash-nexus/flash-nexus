import type { DnsManager } from '@flash-dns/core'
import type { DnsRecord, RecordRef } from '@flash-dns/types'
import type {
  AdapterContext,
  DnsAdapter,
  DnsRecordRef,
  DnsRecordSpec,
} from '@flash-tunnel/types'

export interface FlashDnsAdapterOptions {
  manager: DnsManager<{ proxied?: boolean }>
  application?: string
}

interface StoredRecord {
  ref: RecordRef
  record: DnsRecord<{ proxied?: boolean }>
}

function ttlFor(spec: DnsRecordSpec): 'auto' | number | undefined {
  return spec.ttl === 1
    ? 'auto'
    : spec.ttl
}

function publicRecord(stored: StoredRecord, spec: DnsRecordSpec): DnsRecordRef {
  return {
    provider: stored.ref.provider,
    zoneId: stored.ref.zoneId,
    recordId: stored.ref.recordId,
    name: stored.record.name,
    type: spec.type,
    content: stored.record.content,
    proxied: stored.record.providerOptions?.proxied ?? spec.proxied ?? false,
  }
}

/**
 * Adapt flash-dns's ownership-aware manager to flash-tunnel's DNS lifecycle.
 * The bridge deliberately lives in flash-nexus so the two lower-level
 * projects remain independent.
 */
export function createFlashDnsAdapter(options: FlashDnsAdapterOptions): DnsAdapter {
  const application = options.application ?? 'flash-nexus'
  const records = new Map<string, StoredRecord>()

  return {
    kind: 'dns',
    id: 'cloudflare',
    apiVersion: 1,
    capabilities: {
      recordTypes: ['CNAME', 'A', 'AAAA', 'TXT'],
      proxied: true,
      ttl: true,
      comment: true,
      lookupByName: true,
    },
    preflight: async () => {
      // flash-dns performs conflict and ownership checks atomically in ensure.
    },
    async ensure(ctx: AdapterContext, spec: DnsRecordSpec): Promise<DnsRecordRef> {
      const result = await options.manager.ensure({
        zone: spec.zone,
        name: spec.name,
        type: spec.type,
        content: spec.content,
        owner: { application, id: ctx.sessionId },
        ttl: ttlFor(spec),
        providerOptions: spec.proxied === undefined
          ? {}
          : { proxied: spec.proxied },
      }, {
        signal: ctx.signal,
        requestId: ctx.sessionId,
      })
      const stored = { ref: result.ref, record: result.record }
      records.set(result.ref.recordId, stored)
      return publicRecord(stored, spec)
    },
    async remove(ctx: AdapterContext, ref: DnsRecordRef): Promise<void> {
      const stored = records.get(ref.recordId)
      if (!stored) {
        throw new Error(`DNS record ${ref.recordId} is not owned by this session`)
      }
      await options.manager.remove(stored.ref, {
        signal: ctx.signal,
        requestId: ctx.sessionId,
      })
      records.delete(ref.recordId)
    },
    async find(): Promise<DnsRecordRef[]> {
      return []
    },
  }
}
