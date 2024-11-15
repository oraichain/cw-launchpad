export type MintNft = {
  mint_nft: {
    token_id: string;
  };
};

export type BatchMintNft = {
  batch_mint_nft: {
    token_ids: string[];
  };
};

export type MintNftClones = {
  mint_nft_clones: {
    /**
     * token id of the first minted clone
     */
    first_minted: string;
    /**
     * token id of the last minted clone
     */
    last_minted: string;
  };
};

export type SetMetadata = {
  set_metadata: {
    status: ResponseStatus;
  };
};

export type SetRoyaltyInfo = {
  set_royalty_info: {
    status: ResponseStatus;
  };
};

export type MakeOwnershipPrivate = {
  make_ownership_private: {
    status: ResponseStatus;
  };
};

export type Reveal = {
  reveal: {
    status: ResponseStatus;
  };
};

export type Approve = {
  approve: {
    status: ResponseStatus;
  };
};

export type Revoke = {
  revoke: {
    status: ResponseStatus;
  };
};

export type ApproveAll = {
  approve_all: {
    status: ResponseStatus;
  };
};

export type RevokeAll = {
  revoke_all: {
    status: ResponseStatus;
  };
};

export type SetGlobalApproval = {
  set_global_approval: {
    status: ResponseStatus;
  };
};

export type SetWhitelistedApproval = {
  set_whitelisted_approval: {
    status: ResponseStatus;
  };
};

export type TransferNft = {
  transfer_nft: {
    status: ResponseStatus;
  };
};

export type BatchTransferNft = {
  batch_transfer_nft: {
    status: ResponseStatus;
  };
};

export type SendNft = {
  send_nft: {
    status: ResponseStatus;
  };
};

export type BatchSendNft = {
  batch_send_nft: {
    status: ResponseStatus;
  };
};

export type BurnNft = {
  burn_nft: {
    status: ResponseStatus;
  };
};

export type BatchBurnNft = {
  batch_burn_nft: {
    status: ResponseStatus;
  };
};

export type RegisterReceiveNft = {
  register_receive_nft: {
    status: ResponseStatus;
  };
};

export type VieweingKey = {
  viewing_key: {
    key: string;
  };
};

export type AddMinters = {
  add_minters: {
    status: ResponseStatus;
  };
};

export type RemoveMinters = {
  remove_minters: {
    status: ResponseStatus;
  };
};

export type SetMinters = {
  set_minters: {
    status: ResponseStatus;
  };
};

export type ChangeAdmin = {
  change_admin: {
    status: ResponseStatus;
  };
};

export type SetContractStatus = {
  set_contract_status: {
    status: ResponseStatus;
  };
};

export type RevokePermit = {
  revoke_permit: {
    status: ResponseStatus;
  };
};

export type ResponseStatus = "success" | "failure";
