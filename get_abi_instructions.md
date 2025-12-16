# How to Get Contract ABI

## Option 1: Manual from Etherscan
1. Go to: https://etherscan.io/address/0xe0e7f149959c6cac0dDc2Cb4ab27942BFFdA1eb4
2. Click on the "Contract" tab
3. Click "Read as Proxy" or "Read Contract"
4. Copy the ABI JSON from the "ABI" section

## Option 2: Using Etherscan API (requires API key)
Get a free API key from: https://etherscan.io/apis
Then use:
```
curl "https://api.etherscan.io/api?module=contract&action=getabi&address=0xe0e7f149959c6cac0dDc2Cb4ab27942BFFdA1eb4&apikey=YOUR_API_KEY"
```

## Option 3: Check if current ABI works
The current ABI might work if it's a standard ERC-721 claim function. Try running the bot first - if it fails with "function not found" error, then we need to update the ABI.

## Current ABI in abi.js:
The current ABI has a "claim" function with these parameters:
- receiver (address)
- quantity (uint256) 
- currency (address)
- pricePerToken (uint256)
- allowlistProof (tuple with proof array and maxQuantity)
- data (bytes)

This is a standard format for allowlist-based mints, which should work for most freemint contracts.