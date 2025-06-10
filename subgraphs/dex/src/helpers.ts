/* eslint-disable prefer-const */
import { Address, BigDecimal, BigInt } from '@graphprotocol/graph-ts'

import { ERC20 } from '../generated/Factory/ERC20'
import { ERC20NameBytes } from '../generated/Factory/ERC20NameBytes'
import { ERC20SymbolBytes } from '../generated/Factory/ERC20SymbolBytes'
import { User } from '../generated/schema'
import { SKIP_TOTAL_SUPPLY, STATIC_TOKEN_DEFINITIONS, TokenDefinition } from './chain'
import { ONE_BI, ZERO_BD, ZERO_BI } from './constants'

export function exponentToBigDecimal(decimals: BigInt): BigDecimal {
  let bd = BigDecimal.fromString('1')
  for (let i = ZERO_BI; i.lt(decimals); i = i.plus(ONE_BI)) {
    bd = bd.times(BigDecimal.fromString('10'))
  }
  return bd
}

export function bigDecimalExp18(): BigDecimal {
  return BigDecimal.fromString('1000000000000000000')
}

export function convertKlcToDecimal(klc: BigInt): BigDecimal {
  return klc.toBigDecimal().div(exponentToBigDecimal(BigInt.fromI32(18)))
}

export function convertTokenToDecimal(tokenAmount: BigInt, exchangeDecimals: BigInt): BigDecimal {
  if (exchangeDecimals == ZERO_BI) {
    return tokenAmount.toBigDecimal()
  }
  return tokenAmount.toBigDecimal().div(exponentToBigDecimal(exchangeDecimals))
}

export function equalToZero(value: BigDecimal): boolean {
  const formattedVal = value.toString()
  const zero = ZERO_BD.toString()
  if (zero == formattedVal) {
    return true
  }
  return false
}

export function isNullKlcValue(value: string): boolean {
  return value == '0x0000000000000000000000000000000000000000000000000000000000000001'
}

function getStaticDefinition(tokenAddress: Address): TokenDefinition | null {
  let staticDefinitions = STATIC_TOKEN_DEFINITIONS
  for (let i = 0; i < staticDefinitions.length; i++) {
    if (staticDefinitions[i].address == tokenAddress.toHexString()) {
      return staticDefinitions[i]
    }
  }
  return null
}

export function fetchTokenSymbol(tokenAddress: Address): string {
  // static definitions overrides
  let staticDefinition = getStaticDefinition(tokenAddress)
  if (staticDefinition != null) {
    return (staticDefinition as TokenDefinition).symbol
  }

  let contract = ERC20.bind(tokenAddress)
  let contractSymbolBytes = ERC20SymbolBytes.bind(tokenAddress)

  // try types string and bytes32 for symbol
  let symbolValue = 'unknown'
  let symbolResult = contract.try_symbol()
  if (symbolResult.reverted) {
    let symbolResultBytes = contractSymbolBytes.try_symbol()
    if (!symbolResultBytes.reverted) {
      // for broken pairs that have no symbol function exposed
      if (!isNullKlcValue(symbolResultBytes.value.toString())) {
        // Safely convert bytes32 to string to avoid UTF-16 issues
        let bytesString = symbolResultBytes.value.toString()
        // Filter out null bytes and invalid characters
        let cleanString = ''
        for (let i = 0; i < bytesString.length; i++) {
          let char = bytesString.charAt(i)
          if (char != '\0' && char.charCodeAt(0) > 31 && char.charCodeAt(0) < 127) {
            cleanString += char
          }
        }
        symbolValue = cleanString.length > 0 ? cleanString : 'unknown'
      }
    }
  } else {
    symbolValue = symbolResult.value
  }

  return symbolValue
}

export function fetchTokenName(tokenAddress: Address): string {
  // static definitions overrides
  let staticDefinition = getStaticDefinition(tokenAddress)
  if (staticDefinition != null) {
    return (staticDefinition as TokenDefinition).name
  }

  let contract = ERC20.bind(tokenAddress)
  let contractNameBytes = ERC20NameBytes.bind(tokenAddress)

  // try types string and bytes32 for name
  let nameValue = 'unknown'
  let nameResult = contract.try_name()
  if (nameResult.reverted) {
    let nameResultBytes = contractNameBytes.try_name()
    if (!nameResultBytes.reverted) {
      // for broken exchanges that have no name function exposed
      if (!isNullKlcValue(nameResultBytes.value.toString())) {
        // Safely convert bytes32 to string to avoid UTF-16 issues
        let bytesString = nameResultBytes.value.toString()
        // Filter out null bytes and invalid characters
        let cleanString = ''
        for (let i = 0; i < bytesString.length; i++) {
          let char = bytesString.charAt(i)
          if (char != '\0' && char.charCodeAt(0) > 31 && char.charCodeAt(0) < 127) {
            cleanString += char
          }
        }
        nameValue = cleanString.length > 0 ? cleanString : 'unknown'
      }
    }
  } else {
    nameValue = nameResult.value
  }

  return nameValue
}

export function fetchTokenTotalSupply(tokenAddress: Address): BigInt {
  if (SKIP_TOTAL_SUPPLY.includes(tokenAddress.toHexString())) {
    return BigInt.fromI32(0)
  }

  let contract = ERC20.bind(tokenAddress)
  let totalSupplyValue = BigInt.fromI32(0)
  let totalSupplyResult = contract.try_totalSupply()
  if (!totalSupplyResult.reverted) {
    totalSupplyValue = totalSupplyResult.value
  }
  return totalSupplyValue
}

export function fetchTokenDecimals(tokenAddress: Address): BigInt {
  // static definitions overrides
  let staticDefinition = getStaticDefinition(tokenAddress)
  if (staticDefinition != null) {
    return (staticDefinition as TokenDefinition).decimals
  }

  let contract = ERC20.bind(tokenAddress)
  // try types uint8 for decimals
  let decimalValue = 0
  let decimalResult = contract.try_decimals()
  if (!decimalResult.reverted) {
    decimalValue = decimalResult.value
  }
  return BigInt.fromI32(decimalValue)
}

export function createUser(address: Address): void {
  let user = User.load(address.toHexString())
  if (!user) {
    user = new User(address.toHexString())
    user.save()
  }
}




