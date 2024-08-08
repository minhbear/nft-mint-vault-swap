use anchor_lang::prelude::*;

use crate::{common::ErrorCode, ProtocolConfig, CONFIG_SEED};

#[derive(Accounts)]
pub struct SetFee<'info> {
  #[account(mut)]
  pub signer: Signer<'info>,

  #[account(
    mut,
    seeds = [CONFIG_SEED.as_ref()],
    bump,
    constraint = protocol_config.authority.key() == signer.key() @ ErrorCode::Unauthorized
  )]
  pub protocol_config: Account<'info, ProtocolConfig>,
}

impl<'info> SetFee<'info> {
  pub fn handler(&mut self, fee: u64) -> Result<()> {
      self.protocol_config.fee = fee;
      Ok(())
  }
}
