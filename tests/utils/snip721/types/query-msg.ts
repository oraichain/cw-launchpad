export type ContractInfo = {
  contract_info: Record<string, never>;
};

export type ContractConfig = {
  contract_config: Record<string, never>;
};

export type Minters = {
  minters: Record<string, never>;
};

export type NumTokens = {
  num_tokens: {
    /**
     * optional address and key requesting to view the number of tokens
     */
    viewer?: ViewerInfo | null;
  };
};

export type AllTokens = {
  all_tokens: {
    /**
     * optional number of token ids to display
     */
    limit?: number | null;
    /**
     * paginate by providing the last token_id received in the previous query
     */
    start_after?: string | null;
    /**
     * optional address and key requesting to view the list of tokens
     */
    viewer?: ViewerInfo | null;
  };
};

export type OwnerOf = {
  owner_of: {
    /**
     * optionally include expired Approvals in the response list.  If ommitted or false, expired Approvals will be filtered out of the response
     */
    include_expired?: boolean | null;
    token_id: string;
    /**
     * optional address and key requesting to view the token owner
     */
    viewer?: ViewerInfo | null;
  };
};

export type NftInfo = {
  nft_info: {
    token_id: string;
  };
};

export type AllNftInfo = {
  all_nft_info: {
    /**
     * optionally include expired Approvals in the response list.  If ommitted or false, expired Approvals will be filtered out of the response
     */
    include_expired?: boolean | null;
    token_id: string;
    /**
     * optional address and key requesting to view the token owner
     */
    viewer?: ViewerInfo | null;
  };
};

export type PrivateMetadata = {
  private_metadata: {
    token_id: string;
    /**
     * optional address and key requesting to view the private metadata
     */
    viewer?: ViewerInfo | null;
  };
};

export type NftDossier = {
  nft_dossier: {
    /**
     * optionally include expired Approvals in the response list.  If ommitted or false, expired Approvals will be filtered out of the response
     */
    include_expired?: boolean | null;
    token_id: string;
    /**
     * optional address and key requesting to view the token information
     */
    viewer?: ViewerInfo | null;
  };
};

export type BatchNftDossier = {
  batch_nft_dossier: {
    /**
     * optionally include expired Approvals in the response list.  If ommitted or false, expired Approvals will be filtered out of the response
     */
    include_expired?: boolean | null;
    token_ids: string[];
    /**
     * optional address and key requesting to view the token information
     */
    viewer?: ViewerInfo | null;
  };
};

export type TokenApprovals = {
  token_approvals: {
    /**
     * optionally include expired Approvals in the response list.  If ommitted or false, expired Approvals will be filtered out of the response
     */
    include_expired?: boolean | null;
    token_id: string;
    /**
     * the token owner's viewing key
     */
    viewing_key: string;
  };
};

export type InventoryApprovals = {
  inventory_approvals: {
    address: HumanAddr;
    /**
     * optionally include expired Approvals in the response list.  If ommitted or false, expired Approvals will be filtered out of the response
     */
    include_expired?: boolean | null;
    /**
     * the viewing key
     */
    viewing_key: string;
  };
};

export type ApprovedForAll = {
  approved_for_all: {
    /**
     * optionally include expired Approvals in the response list.  If ommitted or false, expired Approvals will be filtered out of the response
     */
    include_expired?: boolean | null;
    owner: HumanAddr;
    /**
     * optional viewing key to authenticate this query.  It is "optional" only in the sense that a CW721 query does not have this field.  However, not providing the key will always result in an empty list
     */
    viewing_key?: string | null;
  };
};

export type Tokens = {
  tokens: {
    /**
     * optional number of token ids to display
     */
    limit?: number | null;
    owner: HumanAddr;
    /**
     * paginate by providing the last token_id received in the previous query
     */
    start_after?: string | null;
    /**
     * optional address of the querier if different from the owner
     */
    viewer?: HumanAddr | null;
    /**
     * optional viewing key
     */
    viewing_key?: string | null;
  };
};

export type NumTokensOfOwner = {
  num_tokens_of_owner: {
    owner: HumanAddr;
    /**
     * optional address of the querier if different from the owner
     */
    viewer?: HumanAddr | null;
    /**
     * optional viewing key
     */
    viewing_key?: string | null;
  };
};

export type IsUnwrapped = {
  is_unwrapped: {
    token_id: string;
  };
};

export type IsTransferable = {
  is_transferable: {
    token_id: string;
  };
};

export type ImplementsNonTransferableTokens = {
  implements_non_transferable_tokens: Record<string, never>;
};

export type ImplementsTokenSubtype = {
  implements_token_subtype: Record<string, never>;
};

export type verifyTransferApproval = {
  verify_transfer_approval: {
    /**
     * address that has approval
     */
    address: HumanAddr;
    /**
     * list of tokens to verify approval for
     */
    token_ids: string[];
    /**
     * viewing key
     */
    viewing_key: string;
  };
};

export type TransactionHistory = {
  transaction_history: {
    address: HumanAddr;
    /**
     * optional page to display
     */
    page?: number | null;
    /**
     * optional number of transactions per page
     */
    page_size?: number | null;
    /**
     * viewing key
     */
    viewing_key: string;
  };
};

export type RegisteredCodeHash = {
  registered_code_hash: {
    /**
     * the contract whose receive registration info you want to view
     */
    contract: HumanAddr;
  };
};

export type RoyaltyInfo = {
  royalty_info: {
    /**
     * optional ID of the token whose royalty information should be displayed.  If not provided, display the contract's default royalty information
     */
    token_id?: string | null;
    /**
     * optional address and key requesting to view the royalty information
     */
    viewer?: ViewerInfo | null;
  };
};

export type ContractCreator = {
  contract_creator: Record<string, never>;
};

export type WithPermit = {
  with_permit: {
    /**
     * permit used to verify querier identity
     */
    permit: PermitFor_TokenPermissions;
    /**
     * query to perform
     */
    query: QueryWithPermit;
  };
};

export type HumanAddr = string;
export type TokenPermissions = "allowance" | "balance" | "history" | "owner";

/**
 * Binary is a wrapper around Vec<u8> to add base64 de/serialization with serde. It also adds some helper methods to help encode inline.
 *
 * This is only needed as serde-json-{core,wasm} has a horrible encoding for Vec<u8>
 */
export type Binary = string;

/**
 * queries using permits instead of viewing keys
 */
export type QueryWithPermit =
  | {
    royalty_info: {
      /**
       * optional ID of the token whose royalty information should be displayed.  If not provided, display the contract's default royalty information
       */
      token_id?: string | null;
    };
  }
  | {
    private_metadata: {
      token_id: string;
    };
  }
  | {
    nft_dossier: {
      /**
       * optionally include expired Approvals in the response list.  If ommitted or false, expired Approvals will be filtered out of the response
       */
      include_expired?: boolean | null;
      token_id: string;
    };
  }
  | {
    batch_nft_dossier: {
      /**
       * optionally include expired Approvals in the response list.  If ommitted or false, expired Approvals will be filtered out of the response
       */
      include_expired?: boolean | null;
      token_ids: string[];
    };
  }
  | {
    owner_of: {
      /**
       * optionally include expired Approvals in the response list.  If ommitted or false, expired Approvals will be filtered out of the response
       */
      include_expired?: boolean | null;
      token_id: string;
    };
  }
  | {
    all_nft_info: {
      /**
       * optionally include expired Approvals in the response list.  If ommitted or false, expired Approvals will be filtered out of the response
       */
      include_expired?: boolean | null;
      token_id: string;
    };
  }
  | {
    inventory_approvals: {
      /**
       * optionally include expired Approvals in the response list.  If ommitted or false, expired Approvals will be filtered out of the response
       */
      include_expired?: boolean | null;
    };
  }
  | {
    verify_transfer_approval: {
      /**
       * list of tokens to verify approval for
       */
      token_ids: string[];
    };
  }
  | {
    transaction_history: {
      /**
       * optional page to display
       */
      page?: number | null;
      /**
       * optional number of transactions per page
       */
      page_size?: number | null;
    };
  }
  | {
    num_tokens: Record<string, never>;
  }
  | {
    all_tokens: {
      /**
       * optional number of token ids to display
       */
      limit?: number | null;
      /**
       * paginate by providing the last token_id received in the previous query
       */
      start_after?: string | null;
    };
  }
  | {
    token_approvals: {
      /**
       * optionally include expired Approvals in the response list.  If ommitted or false, expired Approvals will be filtered out of the response
       */
      include_expired?: boolean | null;
      token_id: string;
    };
  }
  | {
    approved_for_all: {
      /**
       * optionally include expired Approvals in the response list.  If ommitted or false, expired Approvals will be filtered out of the response
       */
      include_expired?: boolean | null;
    };
  }
  | {
    tokens: {
      /**
       * optional number of token ids to display
       */
      limit?: number | null;
      owner: HumanAddr;
      /**
       * paginate by providing the last token_id received in the previous query
       */
      start_after?: string | null;
    };
  }
  | {
    num_tokens_of_owner: {
      owner: HumanAddr;
    };
  };

/**
 * the address and viewing key making an authenticated query request
 */
export interface ViewerInfo {
  /**
   * querying address
   */
  address: HumanAddr;
  /**
   * authentication key string
   */
  viewing_key: string;
}

export interface PermitFor_TokenPermissions {
  params: PermitParamsFor_TokenPermissions;
  signature: PermitSignature;
}

export interface PermitParamsFor_TokenPermissions {
  allowed_tokens: HumanAddr[];
  chain_id: string;
  permissions: TokenPermissions[];
  permit_name: string;
}

export interface PermitSignature {
  pub_key: PubKey;
  signature: Binary;
}

export interface PubKey {
  /**
   * ignored, but must be "tendermint/PubKeySecp256k1" otherwise the verification will fail
   */
  type: string;
  /**
   * Secp256k1 PubKey
   */
  value: Binary;
}
