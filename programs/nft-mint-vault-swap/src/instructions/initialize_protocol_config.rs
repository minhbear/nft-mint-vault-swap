use anchor_lang::prelude::*;

use crate::{ProtocolConfig, CONFIG_SEED, DISCRIMINATOR_SIZE, VAULT_SEED};

#[derive(Accounts)]
pub struct InitializeProtocolConfig<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
      init,
      payer = signer,
      space = DISCRIMINATOR_SIZE + ProtocolConfig::INIT_SPACE,
      seeds = [CONFIG_SEED.as_ref()],
      bump
    )]
    pub protocol_config: Account<'info, ProtocolConfig>,

    /// CHECK:
    #[account(
      mut,
      seeds = [VAULT_SEED.as_ref()],
      bump
    )]
    pub vault: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

impl<'info> InitializeProtocolConfig<'info> {
    pub fn handler(&mut self, fee: u64) -> Result<()> {
        self.protocol_config.set_inner(ProtocolConfig {
            authority: self.signer.key(),
            vault: self.vault.key(),
            fee,
        });

        Ok(())
    }
}
