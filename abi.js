export const ABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "receiver", "type": "address" },
      { "internalType": "uint256", "name": "quantity", "type": "uint256" },
      { "internalType": "address", "name": "currency", "type": "address" },
      { "internalType": "uint256", "name": "pricePerToken", "type": "uint256" },
      {
        "components": [
          { "internalType": "bytes32[]", "name": "proof", "type": "bytes32[]" },
          { "internalType": "uint256", "name": "maxQuantity", "type": "uint256" }
        ],
        "internalType": "struct AllowlistProof",
        "name": "allowlistProof",
        "type": "tuple"
      },
      { "internalType": "bytes", "name": "data", "type": "bytes" }
    ],
    "name": "claim",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  }
];
