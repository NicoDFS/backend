# KalyChain Launchpad Protocol

A comprehensive decentralized launchpad protocol built on KalyChain, enabling secure token creation, presales, and fairlaunches with advanced anti-rug pull protection and automated liquidity management.

## 🚀 Overview

The KalyChain Launchpad Protocol is a complete DeFi infrastructure solution that provides:

- **Token Creation**: Deploy standard ERC20 tokens or advanced liquidity-generating tokens with built-in tax mechanisms
- **Presale Management**: Launch traditional presales with configurable parameters and investor protection
- **Fair Launch System**: Conduct fair launches where 100% of raised funds go directly to liquidity provision
- **Anti-Rug Pull Protection**: Automatic LP token locking with configurable durations (1 month to forever)

## 🏗️ Protocol Architecture

### Core Contracts

#### **Token Factories**
- **StandardTokenFactory**: Creates basic ERC20 tokens with standard functionality
- **LiquidityGeneratorTokenFactory**: Creates advanced tokens with:
  - Automatic liquidity generation on each transaction
  - Configurable tax fees (up to 25% total)
  - Charity donation mechanisms
  - Reflection rewards for holders

#### **Launchpad Contracts**
- **Presale**: Traditional presale contract supporting:
  - Configurable token rates and contribution limits
  - Soft cap and hard cap mechanisms
  - Whitelist functionality
  - Automatic LP creation and locking upon finalization
  - Native KLC and ERC20 base token support

- **Fairlaunch**: Fair launch contract ensuring:
  - 100% of raised funds go to liquidity provision
  - No funds allocated to project creators
  - Equal opportunity participation
  - Automatic LP token burning for maximum security

#### **Management & Factory Contracts**
- **TokenFactoryManager**: Central registry tracking all created tokens and authorized factories
- **PresaleFactory**: Factory for deploying individual presale contracts
- **FairLaunchFactory**: Factory for deploying individual fairlaunch contracts

## 🔐 Security Features

### LP Token Locking
- **Automatic Locking**: LP tokens are automatically locked during presale/fairlaunch finalization
- **Configurable Duration**: Lock periods from 1 month to forever
- **Transparent Process**: All locking parameters are visible on-chain
- **Rug Pull Prevention**: Prevents immediate liquidity removal by project owners

### Additional Security Measures
- **Comprehensive Validation**: Extensive input validation and safety checks
- **Reentrancy Protection**: All critical functions protected against reentrancy attacks
- **Access Control**: Role-based permissions for administrative functions
- **Fee Refund System**: Automatic refund of excess fees paid by users

## 💰 Fee Structure

- **Token Creation**: 3 KLC flat fee per token
- **Presale/Fairlaunch Creation**: Configurable creation fees

## 🌐 Network Integration

- **KalyChain Native**: Built specifically for KalyChain (Chain ID: 3888)
- **KalySwap Integration**: Seamless integration with KalySwap (Uniswap V2 fork)
- **Native KLC Support**: Full support for native KLC transactions
- **Multi-Token Support**: Compatible with any ERC20 token as base currency

## 📋 Prerequisites

1. Node.js (v14+ recommended) and npm
2. Hardhat development environment
3. Private key for deployment
4. KalyChain network access

## ⚙️ Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd padV3
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   Create a `.env` file with the following variables:
   ```env
   PRIVATE_KEY=your_private_key_here
   KALYSCAN_API_KEY=your_kalyscan_api_key_here
   ```




## 📋 Deployed Contracts

### **KalyChain Mainnet** (Chain ID: 3888)
✅ **Status**: Successfully deployed and verified

**Network Configuration:**
- Router Address: `0x183F288BF7EEBe1A3f318F4681dF4a70ef32B2f3`
- WKLC Address: `0x069255299Bb729399f3CECaBdc73d15d3D10a2A3`

**Core Infrastructure:**
- TokenFactoryManager: `0xd8C7417F6Da77D534586715Cb1187935043C5A8F`

**Token Factories:**
- StandardTokenFactory: `0xB9228A684822D557ABd419814bC6b536Fa34E3BD`
- LiquidityGeneratorTokenFactory: `0xa13567796eeB7357f48caC8d83b4c1b885B66762`

**Launchpad Contracts:**
- Presale: `0x9882Fb2C3B9C7D3417670a410a4DB70EaFFca5Cb`
- PresaleFactory: `0x42CA326c90868e034293C679BD61F5B0e6c88149`
- Fairlaunch: `0x524e34eAA80F8706bB5F3193702Fa4f1F06a3498`
- FairLaunchFactory: `0xcf2A1325b32c3818B24171513cc9F71ae74592B9`

**Sample Tokens:**
- StandardToken: `0x099f2Ed380535E3683627E5E122D82e039cD6921`
- LiquidityGeneratorToken: `0x3D350050FC8C1C9eCeA820993B54C3b9885F2738`

---

### **KalyChain Testnet** (Chain ID: 3889)
✅ **Status**: Successfully deployed and verified

**Network Configuration:**
- Router Address: `0x7fD3173Eef473F64AD4553169D6d334d42Df1d95`
- WKLC Address: `0x069255299Bb729399f3CECaBdc73d15d3D10a2A3`

**Core Infrastructure:**
- TokenFactoryManager: `0x312f9eD881cf492b9345413C5d482CEEF1B30c51`

**Token Factories:**
- StandardTokenFactory: `0x90bb7c432527C3D9D1278de3B5a2781B503a940C`
- LiquidityGeneratorTokenFactory: `0x7eb64f6264fa120ffDE29531702bf60B17eCed8c`

**Launchpad Contracts:**
- Presale: `0x266479ef6E97A6961Af1C4D526A94C3c7B3eAb77`
- PresaleFactory: `0xd20889cbF4d22A21228d775BB55c09c3FB21Ec31`
- Fairlaunch: `0x50Fd6d4C7b28D2F00FAf398bEA2ef0060DC4D271`
- FairLaunchFactory: `0x16D0dD2ab80c872A3cF7752ED2B5900DC9961443`

**Sample Tokens:**
- StandardToken: `0xECb375943E6ab986304fcf7CdD3c6C911b74D181`
- LiquidityGeneratorToken: `0xe899d4E5F9f00aD16b17eF043A630EF2F36875d4`

## 💡 Usage Examples

### **Creating a Standard Token**
```javascript
// Deploy a basic ERC20 token
const tokenFactory = await ethers.getContractAt("StandardTokenFactory", factoryAddress);
const tx = await tokenFactory.create(
  "MyToken",           // name
  "MTK",              // symbol
  18,                 // decimals
  1000000,            // total supply
  { value: ethers.utils.parseEther("3") } // 3 KLC fee
);
```

### **Creating a Liquidity Generator Token**
```javascript
// Deploy an advanced token with tax mechanisms
const lgFactory = await ethers.getContractAt("LiquidityGeneratorTokenFactory", factoryAddress);
const tx = await lgFactory.create(
  "LiquidToken",      // name
  "LTK",             // symbol
  1000000,           // total supply
  routerAddress,     // DEX router
  charityAddress,    // charity wallet
  200,               // 2% tax fee (in basis points)
  300,               // 3% liquidity fee
  100,               // 1% charity fee
  { value: ethers.utils.parseEther("3") }
);
```

### **Launching a Presale**
```javascript
// Create a presale with LP token locking
const presaleFactory = await ethers.getContractAt("PresaleFactory", factoryAddress);
const tx = await presaleFactory.create(
  tokenAddress,           // sale token
  baseTokenAddress,       // base token (or address(0) for KLC)
  [tokenRate, liquidityRate], // rates
  [minContrib, maxContrib],   // contribution limits
  softCap,               // minimum raise
  hardCap,               // maximum raise
  liquidityPercent,      // % for liquidity
  startTime,             // presale start
  endTime,               // presale end
  { value: creationFee }
);
```

### **Launching a Fairlaunch**
```javascript
// Create a fair launch (100% to liquidity)
const fairlaunchFactory = await ethers.getContractAt("FairLaunchFactory", factoryAddress);
const tx = await fairlaunchFactory.createFairlaunch(
  tokenAddress,          // sale token
  baseTokenAddress,      // base token
  isNative,             // using native KLC
  buybackRate,          // token distribution rate
  isWhitelist,          // whitelist enabled
  sellingAmount,        // tokens for sale
  softCap,              // minimum raise
  100,                  // 100% liquidity (required for fairlaunch)
  startTime,            // launch start
  endTime,              // launch end
  referrerAddress,      // optional referrer
  { value: creationFee }
);
```

## 🔧 Key Features Explained

### **LP Token Locking**
- Automatic locking prevents rug pulls
- Configurable lock duration (1 month to forever)
- Transparent on-chain locking mechanism
- Builds investor confidence and trust

### **Multi-Token Support**
- Native KLC support for gas-efficient transactions
- ERC20 base token compatibility
- Flexible payment options for users
- Seamless integration with existing tokens


## 🤝 Contributing

We welcome contributions to improve the protocol. Please:

1. Fork the repository
2. Create a feature branch
3. Implement your changes with tests
4. Submit a pull request with detailed description

## 🛡️ Security

This protocol has been thoroughly tested with:
- Comprehensive unit and integration test coverage
- Security-focused design patterns
- Anti-rug pull mechanisms
- Reentrancy protection
- Input validation and safety checks

For security concerns, please contact the development team.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Built with ❤️ for the KalyChain ecosystem**

*Empowering secure and fair token launches on KalyChain*