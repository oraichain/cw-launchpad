# Requirements

The project was build with: `rustc 1.64.0`, `node v19.3.0`, `yarn 1.22.19`,
`wasm-opt 105`.

# Test

Run `make test` to test smart contracts

# Build

Run `make build` to build smart contract. Wasm files will be located in the
`./build` directory.

# Tier

The smart contract accepts delegations from users to define their `Tier`. `Tier`
value defines the amount of tokens the buyer can buy in the IDO contract.

## Deploy

Check secretcli version:

```bash
secretcli version
# Should return 1.6.0 or higher
```

Run:

```bash
WALLET="my wallet name"
WALLET_ADDRESS="my wallet address"
TIER_LABEL="tier contract"

# Choose a validator
secretcli query staking validators

# For example, we choose this one
VALIDATOR="secretvaloper1exc4dmsswv2jfghzq5wlq6u3m4jcy2jm57dm4y"

secretcli config broadcast-mode block

# Find code_id value from the output
secretcli tx compute store ./build/tier.wasm \
    --gas 1500000                            \
    --from "$WALLET"                         \
    --yes

# example code id
TIER_CODE_ID="165020"

# testnet
BAND_CONTRACT=secret14swdnnllsfvtnvwmtvnvcj2zu0njsl9cdkk5xp

# mainnet
# BAND_CONTRACT=secret1ezamax2vrhjpy92fnujlpwfj2dpredaafss47k

BAND_CONTRACT_HASH=$(secretcli query compute contract-hash "$BAND_CONTRACT" | tail -c +3)

secretcli tx compute instantiate                     \
    "$TIER_CODE_ID"                                  \
    '{
        "validator": "'"${VALIDATOR}"'",
        "deposits": ["25000000000", "7500000000", "1500000000", "250000000"],
        "band_oracle": "'"${BAND_CONTRACT}"'",
        "band_code_hash": "'"${BAND_CONTRACT_HASH}"'"
    }'                                               \
    --gas 1500000                                    \
    --from "$WALLET"                                 \
    --label "$TIER_LABEL"                            \
    --yes
```

Check the initialization with:

```bash
# It will print the smart contract address
secretcli query compute list-contract-by-code "$TIER_CODE_ID"

TIER_ADDRESS=$(secretcli query compute list-contract-by-code "$TIER_CODE_ID" |
    jq -r '.[-1].contract_address')
```

## Usage

To deposit some SCRT, run:

```bash
secretcli tx compute execute "$TIER_ADDRESS" \
    '{ "deposit": {} }'                      \
    --from "$WALLET"                         \
    --amount 5000uscrt                       \
    --yes
```

To check your tier:

```bash
secretcli q compute query "$TIER_ADDRESS" \
    '{ "user_info": {"address":"'"$WALLET_ADDRESS"'"} }'

# {"user_info":{"tier":4,"timestamp":1671696042,"usd_deposit":"250","scrt_deposit":"318"}}
```

To withdraw your SCRT:

```bash
secretcli tx compute execute "$TIER_ADDRESS" \
    '{ "withdraw": {} }'                     \
    --from "$WALLET"                         \
    --yes
```

Claim your money after unbound period:

```bash
secretcli tx compute execute "$TIER_ADDRESS" \
    '{ "claim": {} }'                        \
    --from "$WALLET"                         \
    --yes
```

# IDO

The smart contract for the IDO platform.

## Deploy

Run:

```bash
secretcli tx compute store ./build/ido.wasm \
    --gas 2500000                           \
    --from "$WALLET"                        \
    --yes

# example code id
IDO_CODE_ID="165021"
```

Instantiate contract:

```bash
NFT_ADDRESS="nft contract address"

NFT_CONTRACT_HASH=$(secretcli query compute contract-hash "${NFT_ADDRESS}" | tail -c +3)
TIER_CONTRACT_HASH=$(secretcli query compute contract-hash "${TIER_ADDRESS}" | tail -c +3)

secretcli tx compute instantiate                             \
    "$IDO_CODE_ID"                                           \
    '{
        "lock_periods": [864000, 1728000, 1728000, 1728000, 1728000],
        "nft_contract": "'"${NFT_ADDRESS}"'",
        "nft_contract_hash": "'"${NFT_CONTRACT_HASH}"'",
        "tier_contract": "'"${TIER_ADDRESS}"'",
        "tier_contract_hash": "'"${TIER_CONTRACT_HASH}"'"
    }'                                                       \
    --gas 2000000                                            \
    --from "$WALLET"                                         \
    --label "$IDO_LABEL"                                     \
    --yes
```

Check the initialization with:

```bash
# It will print the smart contract address
secretcli query compute list-contract-by-code "$IDO_CODE_ID"

IDO_ADDRESS=$(secretcli query compute list-contract-by-code "$IDO_CODE_ID" |
    jq -r '.[-1].contract_address')
```

## Usage

Create IDO:

```bash
AMOUNT=10000
TOKENS_PER_TIER='["4000", "3000", "1500", "1000", "500"]'

IDO_TOKEN="snip20 token contract address"
IDO_TOKEN_HASH=$(secretcli query compute contract-hash "${IDO_TOKEN}" | tail -c +3)

PAYMENT_TOKEN="snip20 token contract address"
PAYMENT_TOKEN_HASH=$(secretcli query compute contract-hash "${PAYMENT_TOKEN}" | tail -c +3)

secretcli tx compute execute "$IDO_TOKEN"    \
    '{
        "increase_allowance": {
            "spender": "'"$IDO_ADDRESS"'",
            "amount": "'"$AMOUNT"'"
        }
    }'                                             \
    --from "$WALLET"                               \
    --yes

# pay with native token
# PAYMENT_TOKEN='"native"'

# pay with custom token
PAYMENT_TOKEN_OPTION='{
    "token": {
        "contract": "'"${PAYMENT_TOKEN}"'",
        "code_hash": "'"${PAYMENT_TOKEN_HASH}"'"
    }
}'

# shared whitelist
WHITELIST_OPTION='{"shared": {}}'

# empty whitelist
# WHITELIST_OPTION='{"empty": {}}'

START_TIME=$(date +%s)
END_TIME=$(date --date='2025-01-01' +%s)
PRICE=100

secretcli tx compute execute "$IDO_ADDRESS"                    \
    '{
        "start_ido": {
            "start_time": '"${START_TIME}"',
            "end_time": '"${END_TIME}"',
            "total_amount": "'"$AMOUNT"'",
            "tokens_per_tier": '"${TOKENS_PER_TIER}"',
            "price": "'"${PRICE}"'",
            "token_contract": "'"${IDO_TOKEN}"'",
            "token_contract_hash": "'"${IDO_TOKEN_HASH}"'",
            "payment": '"${PAYMENT_TOKEN_OPTION}"',
            "whitelist": '"${WHITELIST_OPTION}"'
        }
    }'                                                         \
    --from "$WALLET"                                           \
    --yes
```

Add whitelist:

```bash
IDO_ID=0

secretcli tx compute execute "$IDO_ADDRESS" \
    '{
        "whitelist_add": {
            "addresses": ["user address"],
            "ido_id": '"${IDO_ID}"'
        }
    }'                                      \
    --from "$WALLET"                        \
    --yes
```

Buy some tokens:

```bash
IDO_ID=0
AMOUNT=20

# amount * price
MONEY=2000

secretcli tx compute execute "$PAYMENT_TOKEN" \
    '{
        "increase_allowance": {
            "spender": "'"$IDO_ADDRESS"'",
            "amount": "'"$MONEY"'"
        }
    }'                                        \
    --from "$WALLET"                          \
    --yes

secretcli tx compute execute "$IDO_ADDRESS" \
    '{
        "buy_tokens": {
            "amount": "'"$AMOUNT"'",
            "ido_id": '"$IDO_ID"'
        }
    }'                                      \
    --from "$WALLET"                        \
    --gas 2500000                           \
    --yes
```

Receive tokens after lock period:

```bash
secretcli tx compute execute "$IDO_ADDRESS" \
    '{
        "recv_tokens": {
            "ido_id": '"$IDO_ID"'
        }
    }'                                      \
    --from "$WALLET"                        \
    --gas 2500000                           \
    --yes
```
