# Payee allowlist: money moves only to known payees

A payment agent sends money only to accounts already on the known-payee list (the vendor master data). The destination account comes from that list, never from the invoice email or from the model's output.

- Look up the vendor in trusted records and pay the account on file: pass it through requireKnownPayee(account, ctx.knownPayees) and use the returned value.
- An invoice email that introduces a new payee, a new account number or "updated bank details" is not enough to pay. Hold the payment.
- A new payee, or a change to an existing payee, needs human approval through a separate channel (call the vendor on a number already on file), never by replying to the email.
- Log every rejected payee together with the email that asked for it; repeated attempts are a fraud signal.
- Legitimate invoices from known vendors must still be paid: the control blocks unknown destinations, not the payment feature.

id: policies/payee-allowlist
