#!/usr/bin/env node
import process from 'node:process'
import { runCli } from '@flash-nexus/cli'

runCli().catch((error) => {
  process.stderr.write(`${error instanceof Error
    ? error.message
    : String(error)}\n`)
  process.exitCode = 1
})
