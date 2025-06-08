/* eslint-disable prefer-const */
import { log, BigDecimal } from '@graphprotocol/graph-ts'

import { PairCreated } from '../generated/KalyswapFactory/Factory'
import { Bundle, Pair, PairTokenLookup, Token, KalyswapFactory } from '../generated/schema'
import { Pair as PairTemplate } from '../generated/templates'
import { FACTORY_ADDRESS } from './chain'
import { ZERO_BD, ZERO_BI } from './constants'
import { fetchTokenDecimals, fetchTokenName, fetchTokenSymbol, fetchTokenTotalSupply } from './helpers'

export function handleNewPair(event: PairCreated): void {
  // Completely empty function to test event parsing
}
