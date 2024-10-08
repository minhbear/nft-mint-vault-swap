use anchor_lang::{
    prelude::*,
    system_program::{self, Transfer},
};

use crate::{
    AssetLocker, ProtocolConfig, CONFIG_SEED, DISCRIMINATOR_SIZE, LOCKER_SEED, VAULT_SEED,
};

#[derive(Accounts)]
pub struct LockNft<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
      seeds = [CONFIG_SEED.as_ref()],
      bump,
      has_one = vault
    )]
    pub config: Account<'info, ProtocolConfig>,
    
    /// CHECK: it's ok to use
    #[account(
      mut,
      seeds = [VAULT_SEED.as_ref()],
      bump,
    )]
    pub vault: AccountInfo<'info>,

    /// The address of the asset.
    /// CHECK: Checked in mpl-core.
    #[account(mut)]
    pub asset: AccountInfo<'info>,

    #[account(
      init,
      seeds = [LOCKER_SEED.as_ref(), asset.key.as_ref() , signer.key.as_ref()],
      bump,
      space = DISCRIMINATOR_SIZE + AssetLocker::INIT_SPACE,
      payer = signer,
    )]
    pub asset_locker: Account<'info, AssetLocker>,

    /// The collection to which the asset belongs.
    /// CHECK: Checked in mpl-core.
    #[account(mut)]
    pub collection: Option<AccountInfo<'info>>,

    /// The owner or delegate of the asset.
    pub authority: Option<Signer<'info>>,

    /// The SPL Noop program.
    /// CHECK: Checked in mpl-core.
    pub log_wrapper: Option<AccountInfo<'info>>,

    /// The MPL Core program.
    /// CHECK: Checked in mpl-core.
    #[account(address = mpl_core::ID)]
    pub mpl_core: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

impl<'info> LockNft<'info> {
    pub fn handler(&mut self, lamports: u64) -> Result<()> {
        self.asset_locker.set_inner(AssetLocker {
          asset: self.asset.key(),
          lamports,
          locked_at: Clock::get().unwrap().unix_timestamp,
          owner: self.signer.key()
        });

        self.transfer_nft_to_vault()?;
        self.collect_fee()?;

        Ok(())
    }

    fn transfer_nft_to_vault(&self) -> Result<()> {
      mpl_core::instructions::TransferV1Cpi {
        asset: &self.asset.to_account_info(),
        collection: self.collection.as_ref(),
        payer: &self.signer.to_account_info(),
        authority: self.authority.as_deref(),
        new_owner: &self.vault.to_account_info(),
        system_program: Some(&self.system_program.to_account_info()),
        log_wrapper: self.log_wrapper.as_ref(),
        __program: &self.mpl_core,
        __args: mpl_core::instructions::TransferV1InstructionArgs {
          compression_proof: None
        }
      }
      .invoke()?;

      Ok(())
    }

    fn collect_fee(&self) -> Result<()> {
      let accounts = Transfer {
          from: self.signer.to_account_info(),
          to: self.vault.to_account_info(),
      };

      let ctx = CpiContext::new(self.system_program.to_account_info(), accounts);

      system_program::transfer(ctx, self.config.fee)?;
      Ok(())
    }
}
