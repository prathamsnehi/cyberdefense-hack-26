export function requireKnownPayee(account: string, knownPayees: string[]): string {
  if (!knownPayees.includes(account)) {
    throw new Error(`Blocked: ${account} is not a known payee. New payees need human approval.`);
  }
  return account;
}
