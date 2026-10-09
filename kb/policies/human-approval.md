# Human approval thresholds by amount

Payments above a threshold, or with any risk signal, wait for a person. The agent proposes; a human approves.

| Amount (USD) | Known payee, usual details | New payee or changed bank details |
|---|---|---|
| under 1,000 | pay automatically, logged | hold for one approver |
| 1,000 to 10,000 | one approver | one approver plus a callback to the vendor |
| over 10,000 | two approvers | blocked until finance verifies out of band |

- Approval happens outside the agent's context (dashboard or ticket), never by replying to the email that triggered the payment.
- Several payments to the same vendor within a day count as one amount, so splitting an invoice does not dodge a threshold.
- Urgency or authority claims in the message never lower a threshold.

id: policies/human-approval
