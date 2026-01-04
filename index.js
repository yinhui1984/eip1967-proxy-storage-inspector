const { createPublicClient, http, getContract } = require('viem');
const { mainnet } = require('viem/chains');

// ============================================================================
// Provider Layer: RPC connection setup
// ============================================================================

const RPC_URL = 'https://ethereum.publicnode.com';

const client = createPublicClient({
  chain: mainnet,
  transport: http(RPC_URL)
});

// ============================================================================
// Slot Calculator Layer: EIP-1967 standard slot constants
// ============================================================================

const SLOTS = {
  implementation: '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc',
  admin: '0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103',
  beacon: '0xa3f0ad74a56475140503b51b21ed271001b21c49c36669d033e9d85408451b54'
};

// ============================================================================
// Hex Converter Layer: Convert 32-byte hex to address
// ============================================================================

/**
 * Extract Ethereum address from 32-byte storage value
 * @param {string} rawHex - 32-byte hex string from storage
 * @returns {string|null} - Extracted address or null if zero address
 */
function extractAddress(rawHex) {
  if (!rawHex || rawHex === '0x' || rawHex === '0x0') {
    return null;
  }
  
  // Extract last 40 characters (20 bytes) for address
  const address = `0x${rawHex.slice(-40)}`;
  
  // Check if zero address
  if (address === '0x0000000000000000000000000000000000000000') {
    return null;
  }
  
  return address;
}

// ============================================================================
// Storage Reader Layer: Read storage at specific slot
// ============================================================================

/**
 * Read storage address at specific slot
 * @param {string} contractAddress - Contract address to query
 * @param {string} slot - Storage slot (hex string)
 * @returns {Promise<string|null>} - Address or null if empty
 */
async function getStorageAddress(contractAddress, slot) {
  try {
    const rawHex = await client.getStorageAt({
      address: contractAddress,
      slot: slot
    });
    
    return extractAddress(rawHex);
  } catch (error) {
    throw new Error(`Failed to read storage at slot ${slot}: ${error.message}`);
  }
}

// ============================================================================
// Resolver Layer: Core business logic for proxy analysis
// ============================================================================

/**
 * Get implementation address from beacon contract
 * @param {string} beaconAddress - Beacon contract address
 * @returns {Promise<string|null>} - Implementation address or null
 */
async function getBeaconImplementation(beaconAddress) {
  try {
    const beaconContract = getContract({
      address: beaconAddress,
      abi: [
        {
          name: 'implementation',
          type: 'function',
          stateMutability: 'view',
          inputs: [],
          outputs: [{ type: 'address' }]
        }
      ],
      client: client
    });
    
    const implAddress = await beaconContract.read.implementation();
    return implAddress;
  } catch (error) {
    throw new Error(`Failed to get implementation from beacon: ${error.message}`);
  }
}

/**
 * Analyze EIP-1967 proxy contract
 * @param {string} proxyAddress - Proxy contract address
 * @returns {Promise<Object>} - Analysis results
 */
async function analyzeProxy(proxyAddress) {
  const result = {
    proxyAddress: proxyAddress,
    proxyType: null,
    implementation: null,
    admin: null,
    beacon: null,
    beaconImplementation: null
  };
  
  // 1. Check Implementation slot
  const impl = await getStorageAddress(proxyAddress, SLOTS.implementation);
  
  if (impl) {
    result.proxyType = 'EIP-1967';
    result.implementation = impl;
  } else {
    // 2. If Implementation is empty, check Beacon slot
    const beacon = await getStorageAddress(proxyAddress, SLOTS.beacon);
    
    if (beacon) {
      result.proxyType = 'EIP-1967 (Beacon)';
      result.beacon = beacon;
      
      // 3. Get actual implementation from beacon
      try {
        const beaconImpl = await getBeaconImplementation(beacon);
        result.beaconImplementation = beaconImpl;
      } catch (error) {
        // Beacon exists but cannot read implementation
        result.beaconImplementation = null;
      }
    } else {
      // No implementation or beacon found
      result.proxyType = null;
    }
  }
  
  // 4. Check Admin slot (optional)
  const admin = await getStorageAddress(proxyAddress, SLOTS.admin);
  if (admin) {
    result.admin = admin;
  }
  
  return result;
}

/**
 * Format and display analysis results
 * @param {Object} result - Analysis result object
 */
function formatOutput(result) {
  console.log(`\nAnalyzing contract: ${result.proxyAddress}\n`);
  
  if (!result.proxyType) {
    console.log('❌ Not an EIP-1967 Proxy or slots are empty');
    console.log('\n--- Analysis Complete ---\n');
    return;
  }
  
  console.log(`Proxy detected: ${result.proxyType}\n`);
  
  // Display implementation
  if (result.implementation) {
    console.log(`Implementation: ${result.implementation}`);
  } else if (result.beacon) {
    console.log(`Beacon: ${result.beacon}`);
    if (result.beaconImplementation) {
      console.log(`Beacon Implementation: ${result.beaconImplementation}`);
    } else {
      console.log(`Beacon Implementation: (failed to read)`);
    }
  }
  
  console.log('');
  
  // Display all fields in summary format
  console.log('Summary:');
  console.log(`implementation: ${result.implementation || '(empty)'}`);
  console.log(`admin: ${result.admin || '(empty)'}`);
  console.log(`beacon: ${result.beacon || '(empty)'}`);
  
  if (result.beaconImplementation) {
    console.log(`beaconImplementation: ${result.beaconImplementation}`);
  }
  
  console.log('\n--- Analysis Complete ---\n');
}

// ============================================================================
// CLI Interface
// ============================================================================

/**
 * Validate Ethereum address format
 * @param {string} address - Address to validate
 * @returns {boolean} - True if valid
 */
function isValidAddress(address) {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Main CLI entry point
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('Usage: node index.js <contract-address>');
    console.error('Example: node index.js 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eb48');
    process.exit(1);
  }
  
  const contractAddress = args[0];
  
  // Validate address format
  if (!isValidAddress(contractAddress)) {
    console.error(`Error: Invalid address format: ${contractAddress}`);
    console.error('Address must be a valid Ethereum address (0x followed by 40 hex characters)');
    process.exit(1);
  }
  
  try {
    const result = await analyzeProxy(contractAddress);
    formatOutput(result);
  } catch (error) {
    console.error(`\nError: ${error.message}`);
    console.error('\nPlease check:');
    console.error('  - Contract address is correct');
    console.error('  - Network connection is available');
    console.error('  - RPC endpoint is accessible\n');
    process.exit(1);
  }
}

// Run CLI if executed directly
if (require.main === module) {
  main();
}

module.exports = {
  analyzeProxy,
  getStorageAddress,
  extractAddress,
  SLOTS
};

