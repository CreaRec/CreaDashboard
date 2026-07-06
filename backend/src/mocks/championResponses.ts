import type { ChampionAccount, ChampionInvoice } from '../services/championEnergy/types';

export const MOCK_CHAMPION_ACCOUNTS: ChampionAccount[] = [
  {
    accountId: 'acc-1218208',
    rmAccountNumber: '1218208',
  },
];

export const MOCK_CHAMPION_INVOICES: ChampionInvoice[] = [
  {
    billDate: '2026-05-15',
    amountDue: 132.27,
    usageKwh: 1042,
    currentCharges: 132.27,
  },
  {
    billDate: '2026-04-14',
    amountDue: 118.54,
    usageKwh: 956,
    currentCharges: 118.54,
  },
  {
    billDate: '2026-03-13',
    amountDue: 97.11,
    usageKwh: 812,
    currentCharges: 97.11,
  },
];

export const MOCK_CHAMPION_TOKEN_RESPONSE = {
  access_token: 'mock-champion-access-token',
  refresh_token: 'mock-champion-refresh-token',
  expires_in: 3600,
  token_type: 'Bearer',
};

export const MOCK_CHAMPION_ACCOUNTS_RESPONSE = {
  accountSummaries: MOCK_CHAMPION_ACCOUNTS.map((account) => ({
    id: account.accountId,
    accountNumber: account.rmAccountNumber,
  })),
};

export const MOCK_CHAMPION_ACCOUNT_DETAILS_RESPONSE = {
  invoices: MOCK_CHAMPION_INVOICES,
};
