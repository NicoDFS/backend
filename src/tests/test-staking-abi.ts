const fs = require('fs');
const path = require('path');

// Path to staking ABIs
const stakingAbiPath = path.join(process.cwd(), 'src/blockchain/abis/staking');

// Check if directory exists
if (fs.existsSync(stakingAbiPath)) {
  console.log('✅ Staking ABI directory exists');

  // List all files in the directory
  const files = fs.readdirSync(stakingAbiPath);
  console.log('Found ABI files:', files);

  // Try to load each ABI file
  files.forEach((file: string) => {
    if (file.endsWith('.json')) {
      try {
        const abiContent = fs.readFileSync(path.join(stakingAbiPath, file), 'utf8');
        const abi = JSON.parse(abiContent);
        console.log(`✅ Successfully loaded ${file}`);
      } catch (error: any) {
        console.error(`❌ Error loading ${file}:`, error);
      }
    }
  });
} else {
  console.error('❌ Staking ABI directory does not exist');
}
