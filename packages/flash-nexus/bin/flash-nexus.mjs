#!/usr/bin/env node
import process from 'node:process'
import { runCliFromProcess } from '@flash-nexus/cli'

runCliFromProcess().catch((error) => {
  process.stderr.write(`${error instanceof Error
    ? error.message
    : String(error)}\n`)
  process.exitCode = 1
})
