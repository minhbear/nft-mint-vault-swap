use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct AssetLocker {
  pub owner: Pubkey,
  pub asset: Pubkey,
  pub locked_at: i64,
  pub lamports: u64,
}