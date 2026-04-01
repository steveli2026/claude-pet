#!/usr/bin/env node
import React from 'react'
import { render } from 'ink'
import { App } from './app/App.js'
import { loadGlobalConfig } from './app/config.js'

const config = await loadGlobalConfig()
render(<App initialConfig={config} />)
