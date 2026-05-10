use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

declare_id!("7WDrepbu71dCMPpDeHrafhV3gVGrSPaMgFXp4cUHWyiR");

#[program]
pub mod workspace {
    use super::*;

    // fee_bps: u16, Platform fee in basis points, 250 = 2.5%
    // reserve: Pubkey, Fee collection address, 9PJ8I...3555
    // Token amounts: 1e9 format, Ex: 1000000000 = 1 SOL/TOKEN
    pub fn initialize_config(
        ctx: Context<InitializeConfig>,
        fee_bps: u16,
        reserve: Pubkey,
    ) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.bump = ctx.bumps.config;
        config.authority = ctx.accounts.authority.key();
        config.is_active = true;
        config.is_paused = false;
        config.fee_bps = fee_bps;
        config.reserve = reserve;
        config.version = 1;
        Ok(())
    }

    pub fn create_invoice(
        ctx: Context<CreateInvoice>,
        invoice_id: String,
        payer: Pubkey,
        amount: u64,
        due_date: i64,
        metadata_hash: [u8; 32],
    ) -> Result<()> {
        require!(amount > 0, ErrorCode::InvalidAmount);
        require!(invoice_id.len() <= 36, ErrorCode::InvalidParameter);
        require!(invoice_id.len() > 0, ErrorCode::InvalidParameter);

        let clock = Clock::get()?;
        require!(due_date > clock.unix_timestamp, ErrorCode::InvalidDueDate);
        require!(payer != ctx.accounts.creator.key(), ErrorCode::PayerCannotBeCreator);

        let invoice = &mut ctx.accounts.invoice_account;
        invoice.creator = ctx.accounts.creator.key();
        invoice.payer = payer;
        invoice.amount = amount;
        invoice.token_mint = ctx.accounts.token_mint.key();
        invoice.due_date = due_date;
        invoice.status = InvoiceStatus::Draft;
        invoice.invoice_id = invoice_id;
        invoice.metadata_hash = metadata_hash;
        invoice.created_at = clock.unix_timestamp;
        invoice.paid_at = 0;
        invoice.bump = ctx.bumps.invoice_account;

        let escrow_auth = &mut ctx.accounts.escrow_authority;
        escrow_auth.invoice = ctx.accounts.invoice_account.key();
        escrow_auth.bump = ctx.bumps.escrow_authority;

        Ok(())
    }

    pub fn send_invoice(ctx: Context<SendInvoice>) -> Result<()> {
        let invoice = &mut ctx.accounts.invoice_account;
        require!(invoice.status == InvoiceStatus::Draft, ErrorCode::InvalidStatus);
        require!(invoice.creator == ctx.accounts.creator.key(), ErrorCode::Unauthorized);

        invoice.status = InvoiceStatus::Sent;
        Ok(())
    }

    pub fn pay_invoice(ctx: Context<PayInvoice>, payment_method: u8) -> Result<()> {
        let invoice = &ctx.accounts.invoice_account;
        require!(
            invoice.status == InvoiceStatus::Sent || invoice.status == InvoiceStatus::Viewed,
            ErrorCode::InvalidStatus
        );
        require!(payment_method <= 3, ErrorCode::InvalidPaymentMethod);

        let amount = invoice.amount;
        let mint_key = invoice.token_mint;
        require!(ctx.accounts.token_mint.key() == mint_key, ErrorCode::InvalidMint);

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.payer_token_account.to_account_info(),
                    to: ctx.accounts.escrow_vault.to_account_info(),
                    authority: ctx.accounts.payer.to_account_info(),
                },
            ),
            amount,
        )?;

        let clock = Clock::get()?;

        let invoice = &mut ctx.accounts.invoice_account;
        invoice.payer = ctx.accounts.payer.key();
        invoice.status = InvoiceStatus::Paid;
        invoice.paid_at = clock.unix_timestamp;

        let payment = &mut ctx.accounts.payment_record;
        payment.invoice = ctx.accounts.invoice_account.key();
        payment.payer = ctx.accounts.payer.key();
        payment.amount = amount;
        payment.token_mint = mint_key;
        payment.paid_at = clock.unix_timestamp;
        payment.payment_method = PaymentMethod::from_u8(payment_method)?;
        payment.bump = ctx.bumps.payment_record;

        Ok(())
    }

    pub fn release_escrow(ctx: Context<ReleaseEscrow>) -> Result<()> {
        let invoice = &ctx.accounts.invoice_account;
        require!(invoice.status == InvoiceStatus::Paid, ErrorCode::InvalidStatus);
        require!(invoice.creator == ctx.accounts.creator.key(), ErrorCode::Unauthorized);

        let invoice_key = ctx.accounts.invoice_account.key();
        let escrow_amount = ctx.accounts.escrow_vault.amount;

        let bump_arr = [ctx.accounts.escrow_authority.bump];
        let seeds = &[b"escrow_auth" as &[u8], invoice_key.as_ref(), &bump_arr];
        let signer_seeds: &[&[&[u8]]] = &[seeds];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.escrow_vault.to_account_info(),
                    to: ctx.accounts.creator_token_account.to_account_info(),
                    authority: ctx.accounts.escrow_authority.to_account_info(),
                },
                signer_seeds,
            ),
            escrow_amount,
        )?;

        let invoice = &mut ctx.accounts.invoice_account;
        invoice.status = InvoiceStatus::Settled;

        Ok(())
    }

    pub fn pay_x402(ctx: Context<PayInvoice>, payment_method_data: u8) -> Result<()> {
        let invoice = &ctx.accounts.invoice_account;
        require!(
            invoice.status == InvoiceStatus::Sent || invoice.status == InvoiceStatus::Viewed,
            ErrorCode::InvalidStatus
        );

        let _ = payment_method_data;

        let amount = invoice.amount;
        let mint_key = invoice.token_mint;
        require!(ctx.accounts.token_mint.key() == mint_key, ErrorCode::InvalidMint);

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.payer_token_account.to_account_info(),
                    to: ctx.accounts.escrow_vault.to_account_info(),
                    authority: ctx.accounts.payer.to_account_info(),
                },
            ),
            amount,
        )?;

        let clock = Clock::get()?;

        let invoice = &mut ctx.accounts.invoice_account;
        invoice.payer = ctx.accounts.payer.key();
        invoice.status = InvoiceStatus::Paid;
        invoice.paid_at = clock.unix_timestamp;

        let payment = &mut ctx.accounts.payment_record;
        payment.invoice = ctx.accounts.invoice_account.key();
        payment.payer = ctx.accounts.payer.key();
        payment.amount = amount;
        payment.token_mint = mint_key;
        payment.paid_at = clock.unix_timestamp;
        payment.payment_method = PaymentMethod::X402;
        payment.bump = ctx.bumps.payment_record;

        Ok(())
    }

    pub fn dispute_invoice(ctx: Context<DisputeInvoice>) -> Result<()> {
        let invoice = &mut ctx.accounts.invoice_account;
        require!(invoice.status == InvoiceStatus::Paid, ErrorCode::InvalidStatus);

        let caller_key = ctx.accounts.caller.key();
        require!(
            caller_key == invoice.creator || caller_key == invoice.payer,
            ErrorCode::Unauthorized
        );

        invoice.status = InvoiceStatus::Disputed;
        Ok(())
    }

    pub fn refund_invoice(ctx: Context<RefundInvoice>) -> Result<()> {
        let invoice = &ctx.accounts.invoice_account;
        require!(invoice.status == InvoiceStatus::Disputed, ErrorCode::InvalidStatus);
        require!(invoice.creator == ctx.accounts.creator.key(), ErrorCode::Unauthorized);

        let invoice_key = ctx.accounts.invoice_account.key();
        let escrow_amount = ctx.accounts.escrow_vault.amount;

        let bump_arr = [ctx.accounts.escrow_authority.bump];
        let seeds = &[b"escrow_auth" as &[u8], invoice_key.as_ref(), &bump_arr];
        let signer_seeds: &[&[&[u8]]] = &[seeds];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.escrow_vault.to_account_info(),
                    to: ctx.accounts.payer_token_account.to_account_info(),
                    authority: ctx.accounts.escrow_authority.to_account_info(),
                },
                signer_seeds,
            ),
            escrow_amount,
        )?;

        let invoice = &mut ctx.accounts.invoice_account;
        invoice.status = InvoiceStatus::Refunded;

        Ok(())
    }
}

// ============================================================
// Account Structs
// ============================================================

#[account]
pub struct Config {
    pub bump: u8,
    pub authority: Pubkey,
    pub is_active: bool,
    pub is_paused: bool,
    pub fee_bps: u16,
    pub reserve: Pubkey,
    pub version: u8,
}

impl Config {
    pub const LEN: usize = 1 + 32 + 1 + 1 + 2 + 32 + 1;
}

#[account]
pub struct InvoiceAccount {
    pub creator: Pubkey,
    pub payer: Pubkey,
    pub amount: u64,
    pub token_mint: Pubkey,
    pub due_date: i64,
    pub status: InvoiceStatus,
    pub invoice_id: String,
    pub metadata_hash: [u8; 32],
    pub created_at: i64,
    pub paid_at: i64,
    pub bump: u8,
}

impl InvoiceAccount {
    // 32 + 32 + 8 + 32 + 8 + 1 + (4+36) + 32 + 8 + 8 + 1 = 202
    pub const LEN: usize = 32 + 32 + 8 + 32 + 8 + 1 + (4 + 36) + 32 + 8 + 8 + 1;
}

#[account]
pub struct EscrowAuthority {
    pub invoice: Pubkey,
    pub bump: u8,
}

impl EscrowAuthority {
    pub const LEN: usize = 32 + 1;
}

#[account]
pub struct PaymentRecord {
    pub invoice: Pubkey,
    pub payer: Pubkey,
    pub amount: u64,
    pub token_mint: Pubkey,
    pub paid_at: i64,
    pub payment_method: PaymentMethod,
    pub bump: u8,
}

impl PaymentRecord {
    // 32 + 32 + 8 + 32 + 8 + 1 + 1 = 114
    pub const LEN: usize = 32 + 32 + 8 + 32 + 8 + 1 + 1;
}

// ============================================================
// Enums
// ============================================================

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum InvoiceStatus {
    Draft,
    Sent,
    Viewed,
    Paid,
    Settled,
    Disputed,
    Refunded,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum PaymentMethod {
    Wallet,
    CrossChain,
    FiatCard,
    X402,
}

impl PaymentMethod {
    pub fn from_u8(val: u8) -> Result<Self> {
        match val {
            0 => Ok(PaymentMethod::Wallet),
            1 => Ok(PaymentMethod::CrossChain),
            2 => Ok(PaymentMethod::FiatCard),
            3 => Ok(PaymentMethod::X402),
            _ => Err(error!(ErrorCode::InvalidPaymentMethod)),
        }
    }
}

// ============================================================
// Context Structs
// ============================================================

#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    #[account(
        init,
        seeds = [b"config", authority.key().as_ref()],
        bump,
        payer = authority,
        space = 8 + Config::LEN
    )]
    pub config: Account<'info, Config>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(invoice_id: String)]
pub struct CreateInvoice<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        init,
        seeds = [b"invoice", creator.key().as_ref(), invoice_id.as_bytes()],
        bump,
        payer = creator,
        space = 8 + InvoiceAccount::LEN
    )]
    pub invoice_account: Account<'info, InvoiceAccount>,

    pub token_mint: Account<'info, Mint>,

    #[account(
        init,
        seeds = [b"escrow", invoice_account.key().as_ref()],
        bump,
        payer = creator,
        token::mint = token_mint,
        token::authority = escrow_authority,
    )]
    pub escrow_vault: Account<'info, TokenAccount>,

    #[account(
        init,
        seeds = [b"escrow_auth", invoice_account.key().as_ref()],
        bump,
        payer = creator,
        space = 8 + EscrowAuthority::LEN
    )]
    pub escrow_authority: Account<'info, EscrowAuthority>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct SendInvoice<'info> {
    pub creator: Signer<'info>,

    #[account(
        mut,
        constraint = invoice_account.creator == creator.key() @ ErrorCode::Unauthorized
    )]
    pub invoice_account: Account<'info, InvoiceAccount>,
}

// ACCOUNTS: 1. payer, 2. invoice_account, 3. payer_token_account, 4. escrow_vault, 5. payment_record, 6. token_mint, 7. token_program, 8. system_program
// TOTAL ACCOUNTS: 8 (✅ PASS ≤8)
// CPI CALLS: 1. token::transfer (✅ PASS ≤3)
#[derive(Accounts)]
pub struct PayInvoice<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        mut,
        constraint = invoice_account.payer == payer.key() @ ErrorCode::Unauthorized
    )]
    pub invoice_account: Account<'info, InvoiceAccount>,

    #[account(
        mut,
        constraint = payer_token_account.owner == payer.key() @ ErrorCode::InvalidOwner,
        constraint = payer_token_account.mint == token_mint.key() @ ErrorCode::InvalidMint
    )]
    pub payer_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [b"escrow", invoice_account.key().as_ref()],
        bump,
        constraint = escrow_vault.mint == token_mint.key() @ ErrorCode::InvalidMint
    )]
    pub escrow_vault: Account<'info, TokenAccount>,

    #[account(
        init,
        seeds = [b"payment", invoice_account.key().as_ref()],
        bump,
        payer = payer,
        space = 8 + PaymentRecord::LEN
    )]
    pub payment_record: Account<'info, PaymentRecord>,

    pub token_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

// ACCOUNTS: 1. creator, 2. invoice_account, 3. escrow_vault, 4. creator_token_account, 5. escrow_authority, 6. token_mint, 7. token_program
// TOTAL ACCOUNTS: 7 (✅ PASS ≤8)
// CPI CALLS: 1. token::transfer (✅ PASS ≤3)
#[derive(Accounts)]
pub struct ReleaseEscrow<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        mut,
        constraint = invoice_account.creator == creator.key() @ ErrorCode::Unauthorized
    )]
    pub invoice_account: Account<'info, InvoiceAccount>,

    #[account(
        mut,
        seeds = [b"escrow", invoice_account.key().as_ref()],
        bump,
        constraint = escrow_vault.mint == token_mint.key() @ ErrorCode::InvalidMint
    )]
    pub escrow_vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = creator_token_account.owner == creator.key() @ ErrorCode::InvalidOwner,
        constraint = creator_token_account.mint == token_mint.key() @ ErrorCode::InvalidMint
    )]
    pub creator_token_account: Account<'info, TokenAccount>,

    #[account(
        seeds = [b"escrow_auth", invoice_account.key().as_ref()],
        bump = escrow_authority.bump
    )]
    pub escrow_authority: Account<'info, EscrowAuthority>,

    pub token_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct DisputeInvoice<'info> {
    pub caller: Signer<'info>,

    #[account(mut)]
    pub invoice_account: Account<'info, InvoiceAccount>,
}

// ACCOUNTS: 1. creator, 2. invoice_account, 3. escrow_vault, 4. payer_token_account, 5. escrow_authority, 6. token_mint, 7. token_program
// TOTAL ACCOUNTS: 7 (✅ PASS ≤8)
// CPI CALLS: 1. token::transfer (✅ PASS ≤3)
#[derive(Accounts)]
pub struct RefundInvoice<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        mut,
        constraint = invoice_account.creator == creator.key() @ ErrorCode::Unauthorized
    )]
    pub invoice_account: Account<'info, InvoiceAccount>,

    #[account(
        mut,
        seeds = [b"escrow", invoice_account.key().as_ref()],
        bump,
        constraint = escrow_vault.mint == token_mint.key() @ ErrorCode::InvalidMint
    )]
    pub escrow_vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = payer_token_account.owner == invoice_account.payer @ ErrorCode::InvalidOwner,
        constraint = payer_token_account.mint == token_mint.key() @ ErrorCode::InvalidMint
    )]
    pub payer_token_account: Account<'info, TokenAccount>,

    #[account(
        seeds = [b"escrow_auth", invoice_account.key().as_ref()],
        bump = escrow_authority.bump
    )]
    pub escrow_authority: Account<'info, EscrowAuthority>,

    pub token_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
}

// ============================================================
// Error Codes
// ============================================================

#[error_code]
pub enum ErrorCode {
    #[msg("Math overflow occurred")]
    MathOverflow,
    #[msg("Insufficient funds")]
    InsufficientFunds,
    #[msg("Unauthorized access")]
    Unauthorized,
    #[msg("Account is inactive")]
    InactiveAccount,
    #[msg("Config is inactive")]
    ConfigInactive,
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Invalid parameter")]
    InvalidParameter,
    #[msg("Already initialized")]
    AlreadyInitialized,
    #[msg("Invalid invoice status for this operation")]
    InvalidStatus,
    #[msg("Due date must be in the future")]
    InvalidDueDate,
    #[msg("Payer cannot be the same as creator")]
    PayerCannotBeCreator,
    #[msg("Invalid payment method")]
    InvalidPaymentMethod,
    #[msg("Invalid mint")]
    InvalidMint,
    #[msg("Invalid token account owner")]
    InvalidOwner,
}