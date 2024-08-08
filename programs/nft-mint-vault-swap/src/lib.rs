pub mod state;
pub mod instructions;
pub mod common;

use anchor_lang::prelude::*;

pub use state::*;
pub use instructions::*;
pub use common::*;

declare_id!("GBcsuNXsnyD6QhLQoHHaCfBpePQALzBE5qUCHYbdc9ap");

#[program]
pub mod nft_mint_vault_swap {
    use super::*;

    pub fn initialize_protocol_config(ctx: Context<InitializeProtocolConfig>, fee: u64) -> Result<()> {
        ctx.accounts.handler(fee)
    }

    pub fn set_fee(ctx: Context<SetFee>, fee: u64) -> Result<()> {
        ctx.accounts.handler(fee)
    }

    pub fn create_collection(ctx: Context<CreateCollection>, args: CreateCollectionV1Args) -> Result<()> {
        ctx.accounts.handler(args)
    }

    pub fn mint_nft(ctx: Context<MintNft>, args: CreateAssetArgs) -> Result<()> {
        ctx.accounts.handler(args)
    }

    pub fn lock_nft(ctx: Context<LockNft>, lamports: u64) -> Result<()> {
        ctx.accounts.handler(lamports)
    }

    pub fn unlock_nft(ctx: Context<UnlockNft>) -> Result<()> {
        ctx.accounts.handler(ctx.bumps)
    }

    pub fn swap_nft(ctx: Context<SwapNft>) -> Result<()> {
        ctx.accounts.handler(ctx.bumps)
    }
}

