export type MintNft = {
  mint_nft: {
    /**
     * optional memo for the tx
     */
    memo?: string | null;
    /**
     * optional owner address. if omitted, owned by the message sender
     */
    owner?: Addr | null;
    /**
     * optional message length padding
     */
    padding?: string | null;
    /**
     * optional private metadata that can only be seen by the owner and whitelist
     */
    private_metadata?: Metadata | null;
    /**
     * optional public metadata that can be seen by everyone
     */
    public_metadata?: Metadata | null;
    /**
     * optional royalty information for this token.  This will be ignored if the token is non-transferable
     */
    royalty_info?: RoyaltyInfo | null;
    /**
     * optional serial number for this token
     */
    serial_number?: SerialNumber | null;
    /**
     * optional token id. if omitted, use current token index
     */
    token_id?: string | null;
    /**
     * optionally true if the token is transferable.  Defaults to true if omitted
     */
    transferable?: boolean | null;
  };
};

export type BatchMintNft = {
  batch_mint_nft: {
    /**
     * list of mint operations to perform
     */
    mints: Mint[];
    /**
     * optional message length padding
     */
    padding?: string | null;
  };
};

export type MintNftClones = {
  mint_nft_clones: {
    /**
     * optional memo for the mint txs
     */
    memo?: string | null;
    /**
     * optional mint run ID
     */
    mint_run_id?: string | null;
    /**
     * optional owner address. if omitted, owned by the message sender
     */
    owner?: Addr | null;
    /**
     * optional message length padding
     */
    padding?: string | null;
    /**
     * optional private metadata that can only be seen by the owner and whitelist
     */
    private_metadata?: Metadata | null;
    /**
     * optional public metadata that can be seen by everyone
     */
    public_metadata?: Metadata | null;
    /**
     * number of clones to mint
     */
    quantity: number;
    /**
     * optional royalty information for these tokens
     */
    royalty_info?: RoyaltyInfo | null;
  };
};

export type SetMetadata = {
  set_metadata: {
    /**
     * optional message length padding
     */
    padding?: string | null;
    /**
     * the optional new private metadata
     */
    private_metadata?: Metadata | null;
    /**
     * the optional new public metadata
     */
    public_metadata?: Metadata | null;
    /**
     * id of the token whose metadata should be updated
     */
    token_id: string;
  };
};

export type SetRoyaltyInfo = {
  set_royalty_info: {
    /**
     * optional message length padding
     */
    padding?: string | null;
    /**
     * the new royalty information.  If None, existing royalty information will be deleted.  It should be noted, that if deleting a token's royalty information while the contract has a default royalty info set up will give the token the default royalty information
     */
    royalty_info?: RoyaltyInfo | null;
    /**
     * optional id of the token whose royalty information should be updated.  If not provided, this updates the default royalty information for any new tokens minted on the contract
     */
    token_id?: string | null;
  };
};

export type Reveal = {
  reveal: {
    /**
     * optional message length padding
     */
    padding?: string | null;
    /**
     * id of the token to unwrap
     */
    token_id: string;
  };
};

export type MakeOwnershipPrivate = {
  make_ownership_private: {
    /**
     * optional message length padding
     */
    padding?: string | null;
  };
};

export type SetGlobalApproval = {
  set_global_approval: {
    /**
     * optional expiration
     */
    expires?: Expiration | null;
    /**
     * optional message length padding
     */
    padding?: string | null;
    /**
     * optional token id to apply approval/revocation to
     */
    token_id?: string | null;
    /**
     * optional permission level for viewing the owner
     */
    view_owner?: AccessLevel | null;
    /**
     * optional permission level for viewing private metadata
     */
    view_private_metadata?: AccessLevel | null;
  };
};

export type SetWhitelistedApproval = {
  set_whitelisted_approval: {
    /**
     * address being granted/revoked permission
     */
    address: Addr;
    /**
     * optional expiration
     */
    expires?: Expiration | null;
    /**
     * optional message length padding
     */
    padding?: string | null;
    /**
     * optional token id to apply approval/revocation to
     */
    token_id?: string | null;
    /**
     * optional permission level for transferring
     */
    transfer?: AccessLevel | null;
    /**
     * optional permission level for viewing the owner
     */
    view_owner?: AccessLevel | null;
    /**
     * optional permission level for viewing private metadata
     */
    view_private_metadata?: AccessLevel | null;
  };
};

export type Approve = {
  approve: {
    /**
     * optional expiration for this approval
     */
    expires?: Expiration | null;
    /**
     * optional message length padding
     */
    padding?: string | null;
    /**
     * address being granted the permission
     */
    spender: Addr;
    /**
     * id of the token that the spender can transfer
     */
    token_id: string;
  };
};

export type Revoke = {
  revoke: {
    /**
     * optional message length padding
     */
    padding?: string | null;
    /**
     * address whose permission is revoked
     */
    spender: Addr;
    /**
     * id of the token that the spender can no longer transfer
     */
    token_id: string;
  };
};

export type ApproveAll = {
  approve_all: {
    /**
     * optional expiration for this approval
     */
    expires?: Expiration | null;
    /**
     * address being granted permission to transfer
     */
    operator: Addr;
    /**
     * optional message length padding
     */
    padding?: string | null;
  };
};

export type RevokeAll = {
  revoke_all: {
    /**
     * address whose permissions are revoked
     */
    operator: Addr;
    /**
     * optional message length padding
     */
    padding?: string | null;
  };
};

export type TransferNft = {
  transfer_nft: {
    /**
     * optional memo for the tx
     */
    memo?: string | null;
    /**
     * optional message length padding
     */
    padding?: string | null;
    /**
     * recipient of the transfer
     */
    recipient: Addr;
    /**
     * id of the token to transfer
     */
    token_id: string;
  };
};

export type BatchTransferNft = {
  batch_transfer_nft: {
    /**
     * optional message length padding
     */
    padding?: string | null;
    /**
     * list of transfers to perform
     */
    transfers: Transfer[];
  };
};

export type SendNft = {
  send_nft: {
    /**
     * address to send the token to
     */
    contract: Addr;
    /**
     * optional memo for the tx
     */
    memo?: string | null;
    /**
     * optional message to send with the (Batch)RecieveNft callback
     */
    msg?: Binary | null;
    /**
     * optional message length padding
     */
    padding?: string | null;
    /**
     * optional code hash and BatchReceiveNft implementation status of the recipient contract
     */
    receiver_info?: ReceiverInfo | null;
    /**
     * id of the token to send
     */
    token_id: string;
  };
};

export type BatchSendNft = {
  batch_send_nft: {
    /**
     * optional message length padding
     */
    padding?: string | null;
    /**
     * list of sends to perform
     */
    sends: Send[];
  };
};

export type BurnNft = {
  burn_nft: {
    /**
     * optional memo for the tx
     */
    memo?: string | null;
    /**
     * optional message length padding
     */
    padding?: string | null;
    /**
     * token to burn
     */
    token_id: string;
  };
};

export type BatchBurnNft = {
  batch_burn_nft: {
    /**
     * list of burns to perform
     */
    burns: Burn[];
    /**
     * optional message length padding
     */
    padding?: string | null;
  };
};

export type RegisterReceiveNft = {
  register_receive_nft: {
    /**
     * optionally true if the contract also implements BatchReceiveNft.  Defaults to false if not specified
     */
    also_implements_batch_receive_nft?: boolean | null;
    /**
     * receving contract's code hash
     */
    code_hash: string;
    /**
     * optional message length padding
     */
    padding?: string | null;
  };
};

export type CreateViewingKey = {
  create_viewing_key: {
    /**
     * entropy String used in random key generation
     */
    entropy: string;
    /**
     * optional message length padding
     */
    padding?: string | null;
  };
};

export type SetViewingKey = {
  set_viewing_key: {
    /**
     * desired viewing key
     */
    key: string;
    /**
     * optional message length padding
     */
    padding?: string | null;
  };
};

export type AddMinters = {
  add_minters: {
    /**
     * list of addresses that can now mint
     */
    minters: Addr[];
    /**
     * optional message length padding
     */
    padding?: string | null;
  };
};

export type RemoveMinters = {
  remove_minters: {
    /**
     * list of addresses no longer allowed to mint
     */
    minters: Addr[];
    /**
     * optional message length padding
     */
    padding?: string | null;
  };
};

export type SetMinters = {
  set_minters: {
    /**
     * list of addresses with minting authority
     */
    minters: Addr[];
    /**
     * optional message length padding
     */
    padding?: string | null;
  };
};

export type ChangeAdmin = {
  change_admin: {
    /**
     * address with admin authority
     */
    address: Addr;
    /**
     * optional message length padding
     */
    padding?: string | null;
  };
};

export type SetContractStatus = {
  set_contract_status: {
    /**
     * status level
     */
    level: ContractStatus;
    /**
     * optional message length padding
     */
    padding?: string | null;
  };
};

export type RevokePermit = {
  revoke_permit: {
    /**
     * optional message length padding
     */
    padding?: string | null;
    /**
     * name of the permit that is no longer valid
     */
    permit_name: string;
  };
};

export type Addr = string;

/**
 * at the given point in time and after, Expiration will be considered expired
 */
export type Expiration =
  | 'never'
  | {
      at_height: number;
    }
  | {
      at_time: number;
    };

/**
 * permission access level
 */
export type AccessLevel = 'approve_token' | 'all' | 'revoke_token' | 'none';
export type ContractStatus = 'normal' | 'stop_transactions' | 'stop_all';

/**
 * Binary is a wrapper around Vec<u8> to add base64 de/serialization with serde. It also adds some helper methods to help encode inline.
 *
 * This is only needed as serde-json-{core,wasm} has a horrible encoding for Vec<u8>
 */
export type Binary = string;

/**
 * token metadata
 */
export interface Metadata {
  /**
   * optional on-chain metadata.  Only use this if you are not using `token_uri`
   */
  extension?: Extension | null;
  /**
   * optional uri for off-chain metadata.  This should be prefixed with `http://`, `https://`, `ipfs://`, or `ar://`.  Only use this if you are not using `extension`
   */
  token_uri?: string | null;
}

/**
 * metadata extension You can add any metadata fields you need here.  These fields are based on https://docs.opensea.io/docs/metadata-standards and are the metadata fields that Stashh uses for robust NFT display.  Urls should be prefixed with `http://`, `https://`, `ipfs://`, or `ar://`
 */
export interface Extension {
  /**
   * url to a multimedia attachment
   */
  animation_url?: string | null;
  /**
   * item attributes
   */
  attributes?: Trait[] | null;
  /**
   * background color represented as a six-character hexadecimal without a pre-pended #
   */
  background_color?: string | null;
  /**
   * item description
   */
  description?: string | null;
  /**
   * url to allow users to view the item on your site
   */
  external_url?: string | null;
  /**
   * url to the image
   */
  image?: string | null;
  /**
   * raw SVG image data (not recommended). Only use this if you're not including the image parameter
   */
  image_data?: string | null;
  /**
   * media files as specified on Stashh that allows for basic authenticatiion and decryption keys. Most of the above is used for bridging public eth NFT metadata easily, whereas `media` will be used when minting NFTs on Stashh
   */
  media?: MediaFile[] | null;
  /**
   * name of the item
   */
  name?: string | null;
  /**
   * a select list of trait_types that are in the private metadata.  This will only ever be used in public metadata
   */
  protected_attributes?: string[] | null;
  /**
   * token subtypes used by Stashh for display groupings (primarily used for badges, which are specified by using "badge" as the token_subtype)
   */
  token_subtype?: string | null;
  /**
   * url to a YouTube video
   */
  youtube_url?: string | null;
}

/**
 * attribute trait
 */
export interface Trait {
  /**
   * indicates how a trait should be displayed
   */
  display_type?: string | null;
  /**
   * optional max value for numerical traits
   */
  max_value?: string | null;
  /**
   * name of the trait
   */
  trait_type?: string | null;
  /**
   * trait value
   */
  value: string;
}

/**
 * media file
 */
export interface MediaFile {
  /**
   * authentication information
   */
  authentication?: Authentication | null;
  /**
   * file extension
   */
  extension?: string | null;
  /**
   * file type Stashh currently uses: "image", "video", "audio", "text", "font", "application"
   */
  file_type?: string | null;
  /**
   * url to the file.  Urls should be prefixed with `http://`, `https://`, `ipfs://`, or `ar://`
   */
  url: string;
}

/**
 * media file authentication
 */
export interface Authentication {
  /**
   * either a decryption key for encrypted files or a password for basic authentication
   */
  key?: string | null;
  /**
   * username used in basic authentication
   */
  user?: string | null;
}

/**
 * all royalty information
 */
export interface RoyaltyInfo {
  /**
   * decimal places in royalty rates
   */
  decimal_places_in_rates: number;
  /**
   * list of royalties
   */
  royalties: Royalty[];
}

/**
 * data for a single royalty
 */
export interface Royalty {
  /**
   * royalty rate
   */
  rate: number;
  /**
   * address to send royalties to
   */
  recipient: Addr;
}

/**
 * Serial number to give an NFT when minting
 */
export interface SerialNumber {
  /**
   * optional number of the mint run this token will be minted in.  A mint run represents a batch of NFTs released at the same time.  So if a creator decided to make 100 copies of an NFT, they would all be part of mint run number 1.  If they sold quickly, and the creator wanted to rerelease that NFT, he could make 100 more copies which would all be part of mint run number 2.
   */
  mint_run?: number | null;
  /**
   * optional total number of NFTs minted on this run.  This is used to represent that this token is number m of n
   */
  quantity_minted_this_run?: number | null;
  /**
   * serial number (in this mint run).  This is used to serialize identical NFTs
   */
  serial_number: number;
}

/**
 * token mint info used when doing a BatchMint
 */
export interface Mint {
  /**
   * optional memo for the tx
   */
  memo?: string | null;
  /**
   * optional owner address, owned by the minter otherwise
   */
  owner?: Addr | null;
  /**
   * optional private metadata that can only be seen by owner and whitelist
   */
  private_metadata?: Metadata | null;
  /**
   * optional public metadata that can be seen by everyone
   */
  public_metadata?: Metadata | null;
  /**
   * optional royalty information for this token.  This will be ignored if the token is non-transferable
   */
  royalty_info?: RoyaltyInfo | null;
  /**
   * optional serial number for this token
   */
  serial_number?: SerialNumber | null;
  /**
   * optional token id, if omitted, use current token index
   */
  token_id?: string | null;
  /**
   * optionally true if the token is transferable.  Defaults to true if omitted
   */
  transferable?: boolean | null;
}

/**
 * token transfer info used when doing a BatchTransferNft
 */
export interface Transfer {
  /**
   * optional memo for the tx
   */
  memo?: string | null;
  /**
   * recipient of the transferred tokens
   */
  recipient: Addr;
  /**
   * tokens being transferred
   */
  token_ids: string[];
}

/**
 * a recipient contract's code hash and whether it implements BatchReceiveNft
 */
export interface ReceiverInfo {
  /**
   * true if the contract also implements BacthReceiveNft.  Defaults to false if not specified
   */
  also_implements_batch_receive_nft?: boolean | null;
  /**
   * recipient's code hash
   */
  recipient_code_hash: string;
}

/**
 * send token info used when doing a BatchSendNft
 */
export interface Send {
  /**
   * recipient of the sent tokens
   */
  contract: Addr;
  /**
   * optional memo for the tx
   */
  memo?: string | null;
  /**
   * optional message to send with the (Batch)RecieveNft callback
   */
  msg?: Binary | null;
  /**
   * optional code hash and BatchReceiveNft implementation status of the recipient contract
   */
  receiver_info?: ReceiverInfo | null;
  /**
   * tokens being sent
   */
  token_ids: string[];
}

/**
 * token burn info used when doing a BatchBurnNft
 */
export interface Burn {
  /**
   * optional memo for the tx
   */
  memo?: string | null;
  /**
   * tokens being burnt
   */
  token_ids: string[];
}
