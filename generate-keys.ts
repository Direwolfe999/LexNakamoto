import { getAddressFromPrivateKey, privateKeyToHex, randomPrivateKey } from "@stacks/transactions";
import { entropyToMnemonic, mnemonicToEntropy } from "bip39";

function main() {
  // Generate randomness with @stacks/transactions
  const randomKey = randomPrivateKey();
  const compressedKeyHex = privateKeyToHex(randomKey); // typically 33-byte hex (ends with 01)

  // Convert the 32-byte key material into a 24-word BIP39 mnemonic
  const entropyHex = compressedKeyHex.slice(0, 64);
  const mnemonic = entropyToMnemonic(entropyHex);

  // Derive private key hex from mnemonic entropy (compressed format for Stacks signing)
  const derivedEntropyHex = mnemonicToEntropy(mnemonic);
  const privateKeyHex = `${derivedEntropyHex}01`;

  // Derive ST (testnet) address
  const testnetAddress = getAddressFromPrivateKey(privateKeyHex, "testnet");

  console.log("\n🔐 LexNakamoto Local Key Generator (Nakamoto Testnet)\n");
  console.log("Mnemonic (24 words):");
  console.log(mnemonic);
  console.log("\nStacks Testnet Address (ST...):");
  console.log(testnetAddress);
  console.log("\nPrivate Key Hex (SPONSOR_PRIVATE_KEY):");
  console.log(privateKeyHex);

  console.log("\n⚠️  SECURITY INSTRUCTIONS");
  console.log("1) Copy these values manually into a local .env file that is gitignored.");
  console.log("2) Never commit this mnemonic/private key to GitHub.");
  console.log("3) This script does NOT send data to any API; it only logs locally.");
  console.log("4) After setup, delete or move this file out of the project folder.\n");
}

main();
